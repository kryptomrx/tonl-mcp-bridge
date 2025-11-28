# 🔧 REFACTORING PLAN: Optional Dependencies

## Problem
Current `package.json` forces ALL database drivers as hard dependencies:
- PostgreSQL (`pg`) ~5MB
- MySQL (`mysql2`) ~4MB  
- SQLite (`better-sqlite3`) ~3MB + requires C++ compiler
- Qdrant (`@qdrant/js-client-rest`) ~8MB
- Milvus (`@zilliz/milvus2-sdk-node`) ~12MB

**Total: ~32MB** even if user only needs JSON ↔ TONL conversion!

## Solution
Convert to **optional peer dependencies** with dynamic imports.

---

## Step 1: Update package.json

### Before:
```json
"dependencies": {
  "pg": "^8.16.3",
  "mysql2": "^3.15.3",
  "better-sqlite3": "^12.4.6",
  "@qdrant/js-client-rest": "^1.16.0",
  "@zilliz/milvus2-sdk-node": "^2.6.5"
}
```

### After:
```json
"dependencies": {
  // Core dependencies only
  "@modelcontextprotocol/sdk": "^1.22.0",
  "chokidar": "^4.0.3",
  "cli-progress": "^3.12.0",
  "commander": "^12.1.0",
  "dotenv": "^17.2.3",
  "express": "^5.1.0",
  "glob": "^13.0.0",
  "js-tiktoken": "^1.0.21",
  "js-yaml": "^4.1.1",
  "zod": "^3.25.76"
},
"peerDependencies": {
  "pg": "^8.0.0",
  "mysql2": "^3.0.0",
  "better-sqlite3": "^9.0.0 || ^10.0.0 || ^11.0.0 || ^12.0.0",
  "@qdrant/js-client-rest": "^1.0.0",
  "@zilliz/milvus2-sdk-node": "^2.0.0"
},
"peerDependenciesMeta": {
  "pg": { "optional": true },
  "mysql2": { "optional": true },
  "better-sqlite3": { "optional": true },
  "@qdrant/js-client-rest": { "optional": true },
  "@zilliz/milvus2-sdk-node": { "optional": true }
},
"devDependencies": {
  // Keep for testing
  "pg": "^8.16.3",
  "mysql2": "^3.15.3",
  "better-sqlite3": "^12.4.6",
  "@qdrant/js-client-rest": "^1.16.0",
  "@zilliz/milvus2-sdk-node": "^2.6.5",
  // ... existing devDependencies
}
```

---

## Step 2: Create Dynamic Import Helpers

**New file: `src/sdk/loaders/postgres-loader.ts`**

```typescript
import type { Pool } from 'pg';

export async function loadPostgresDriver(): Promise<typeof import('pg')> {
  try {
    const pg = await import('pg');
    return pg;
  } catch (error) {
    throw new Error(
      'PostgreSQL driver not found. Install it with: npm install pg\n' +
      'Or if using yarn: yarn add pg'
    );
  }
}

export async function createPostgresPool(config: any): Promise<Pool> {
  const pg = await loadPostgresDriver();
  return new pg.Pool(config);
}
```

Similar files for:
- `src/sdk/loaders/mysql-loader.ts`
- `src/sdk/loaders/sqlite-loader.ts`
- `src/sdk/loaders/qdrant-loader.ts`
- `src/sdk/loaders/milvus-loader.ts`

---

## Step 3: Refactor Adapters

### PostgresAdapter (src/sdk/sql/postgres.ts)

**Before:**
```typescript
import { Pool } from 'pg';

export class PostgresAdapter extends BaseAdapter {
  private pool: Pool | null = null;

  async connect(): Promise<void> {
    this.pool = new Pool({...});
  }
}
```

**After:**
```typescript
import type { Pool } from 'pg'; // Type-only import
import { createPostgresPool } from '../loaders/postgres-loader.js';

export class PostgresAdapter extends BaseAdapter {
  private pool: Pool | null = null;

  async connect(): Promise<void> {
    try {
      this.pool = await createPostgresPool({
        host: this.config.host,
        port: this.config.port || 5432,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
      });
      
      await this.pool.query('SELECT 1');
      this.connected = true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new DatabaseError(
          'PostgreSQL driver not installed',
          'DRIVER_NOT_FOUND',
          error
        );
      }
      throw new DatabaseError(
        'Failed to connect to PostgreSQL',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }
}
```

---

## Step 4: Update Error Types

**Add to `src/utils/errors.ts`:**

```typescript
export class DriverNotFoundError extends TonlError {
  constructor(
    public readonly driverName: string,
    public readonly installCommand: string
  ) {
    super(
      `Driver '${driverName}' not found.\n\n` +
      `Install it with: ${installCommand}\n\n` +
      `This is an optional dependency. Only install if you need it.`,
      'DRIVER_NOT_FOUND'
    );
    this.name = 'DriverNotFoundError';
  }
}
```

---

## Step 5: Update Documentation

### README.md - Installation section

```markdown
## Installation

### Core Library (JSON/YAML ↔ TONL)
```bash
npm install tonl-mcp-bridge
```

### With Database Support (Optional)

**PostgreSQL:**
```bash
npm install tonl-mcp-bridge pg
```

**MySQL:**
```bash
npm install tonl-mcp-bridge mysql2
```

**SQLite:**
```bash
npm install tonl-mcp-bridge better-sqlite3
```

**Vector Databases:**
```bash
# Qdrant
npm install tonl-mcp-bridge @qdrant/js-client-rest

# Milvus
npm install tonl-mcp-bridge @zilliz/milvus2-sdk-node
```

**All Databases:**
```bash
npm install tonl-mcp-bridge pg mysql2 better-sqlite3 @qdrant/js-client-rest @zilliz/milvus2-sdk-node
```
```

---

## Step 6: Testing Strategy

1. **Unit Tests** - Mock the dynamic imports
2. **Integration Tests** - Test with actual drivers installed
3. **Error Tests** - Verify helpful error messages when driver missing

**New test file: `tests/optional-dependencies.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { PostgresAdapter } from '../src/sdk/sql/postgres';

describe('Optional Dependencies', () => {
  it('should throw helpful error when pg not installed', async () => {
    // Mock import to fail
    vi.mock('pg', () => {
      throw new Error('Cannot find module pg');
    });

    const adapter = new PostgresAdapter({
      host: 'localhost',
      database: 'test',
      user: 'test',
      password: 'test'
    });

    await expect(adapter.connect()).rejects.toThrow(
      /PostgreSQL driver not found.*npm install pg/
    );
  });
});
```

---

## Benefits

✅ **Reduced Install Size:**
- Core only: ~2MB (was ~35MB)
- With PostgreSQL: ~7MB (was ~35MB)
- User installs only what they need

✅ **Better DX:**
- Clear error messages
- No build failures from native modules
- Works in serverless environments

✅ **Maintains Compatibility:**
- Existing code works unchanged
- Tests still run (drivers in devDependencies)
- No breaking changes for users

---

## Rollout Plan

### Phase 1: Create loaders (1-2 hours)
- [ ] Create `src/sdk/loaders/` directory
- [ ] Implement all 5 loaders
- [ ] Add error types

### Phase 2: Refactor adapters (2-3 hours)
- [ ] Update PostgresAdapter
- [ ] Update MySQLAdapter  
- [ ] Update SQLiteAdapter
- [ ] Update QdrantAdapter
- [ ] Update MilvusAdapter (if exists)

### Phase 3: Update package.json (30 mins)
- [ ] Move to peerDependencies
- [ ] Mark as optional
- [ ] Keep in devDependencies

### Phase 4: Documentation (1 hour)
- [ ] Update README
- [ ] Update API docs
- [ ] Add migration guide

### Phase 5: Testing (2 hours)
- [ ] Write optional dependency tests
- [ ] Run full test suite
- [ ] Manual testing

**Total Time:** ~8 hours

---

## Migration Guide for Users

### v0.9.0 → v1.0.0

**No action needed if you use all databases** - They'll be installed automatically as peer deps.

**If you only need specific databases:**

1. Uninstall tonl-mcp-bridge
2. Reinstall with specific drivers:

```bash
npm uninstall tonl-mcp-bridge
npm install tonl-mcp-bridge pg  # Only PostgreSQL
```

---

## Risks & Mitigations

**Risk:** Breaking change for existing users  
**Mitigation:** Document clearly, provide migration guide

**Risk:** Complex dynamic import debugging  
**Mitigation:** Clear error messages with install instructions

**Risk:** Type errors with optional imports  
**Mitigation:** Use `type` imports for optional deps

---

## Success Metrics

- [ ] Core package < 3MB
- [ ] All tests passing
- [ ] No breaking changes for full install
- [ ] Clear error messages when driver missing
- [ ] Documentation updated
