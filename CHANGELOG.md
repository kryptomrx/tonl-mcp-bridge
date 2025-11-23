# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2025-11-22

### Added
- **SQLite Adapter**: Full SQLite support with in-memory database capability
- **MySQL Adapter**: Enterprise-grade MySQL support with connection pooling
- **In-Memory Testing**: SQLite `:memory:` support for fast testing without external database
- **Integration Tests**: 20 new database adapter tests (10 SQLite + 10 MySQL)
- **Demo**: SQLite in-memory demo (`examples/sdk-sqlite-demo.ts`)

### Technical Details
- `SQLiteAdapter` extends BaseAdapter with synchronous operations
- `MySQLAdapter` extends BaseAdapter with connection pooling (10 connections default)
- Automatic detection of SELECT vs INSERT/UPDATE/DELETE/CREATE statements (SQLite)
- Uses `better-sqlite3` for high-performance synchronous SQLite operations
- Uses `mysql2` for MySQL with promise-based async API
- Full support for `queryToTonl()` and `queryWithStats()` on all adapters
- 84% test coverage for SQLite adapter

### Tests
- 145 total tests (up from 125)
- 10 new SQLite integration tests with real database operations
- 10 new MySQL adapter tests
- Real database operations tested: CREATE, INSERT, SELECT

### Breaking Changes
None - fully backward compatible

---

## [0.6.0] - 2025-11-22

### Added
- **SDK Foundation**: Base architecture for database adapters
- **PostgreSQL Adapter**: Full-featured PostgreSQL integration with connection pooling
- **SDK Methods**: `queryToTonl()` and `queryWithStats()` for automatic TONL conversion
- **Demo Setup**: Complete Docker-based demo in `examples/sdk-demo/`
- **Security**: Git pre-commit hooks to prevent accidental IP/credential commits
- **Tests**: 2 new SDK tests (92 total, up from 90)

### Technical Details
- New `BaseAdapter` class as foundation for all database adapters
- `PostgresAdapter` with automatic TONL conversion
- Real token statistics with configurable LLM models
- Docker Compose setup for local testing
- Example code and documentation

### Usage
```typescript
import { PostgresAdapter } from 'tonl-mcp-bridge';

const db = new PostgresAdapter({ host, database, user, password });
await db.connect();
const result = await db.queryWithStats('SELECT * FROM users', 'users');
console.log(`Saved ${result.stats.savingsPercent}% tokens`);
```

### Breaking Changes
None - fully backward compatible


## [0.5.0] - 2025-11-21

### Added
- **MCP Server**: Full Model Context Protocol server implementation
- **MCP Tools**: Three tools for AI assistants (convert_to_tonl, parse_tonl, calculate_savings)
- **MCP Inspector support**: Test tools via official MCP Inspector
- **stdio transport**: Standard MCP communication protocol
- **Zod validation**: Input validation for all MCP tools
- **90 unit tests**: Added 11 new tests for MCP functionality

### Changed
- Test suite expanded from 79 to 90 tests
- Added MCP server exports to main package
- Updated package.json with mcp:start script and tonl-mcp-server binary

### Technical
- New binary: `tonl-mcp-server` for starting MCP server
- New script: `npm run mcp:start`
- Server runs on stdio transport for MCP compatibility
- Integration tested with MCP Inspector

## [0.4.0] - 2025-11-20
### Added
- Nested objects support with lossless round-trip
- Batch processing: `tonl batch *.json`
- Watch mode: `tonl watch *.json`
- 79 unit tests (+5 new tests)

## [0.3.0] - 2025-11-20

### Added
- **Streaming API**: Handles large files (>10MB) efficiently with memory-safe streaming
- **--model flag**: Choose tokenizer model (gpt-5, claude-4, gemini-2.5, etc.)
- **--validate flag**: Validate schema consistency before conversion
- **Progress bar**: Visual feedback for large datasets (>100 items)
- **File size detection**: Automatic mode selection based on file size
- **Better error messages**: Detailed context for common errors

### Changed
- **Error handling**: TonlParseError with detailed context
- **CLI output**: More informative messages and validation
- **Performance**: Streaming reduces memory usage by 90% for large files

### Fixed
- Duplicate option flags in CLI
- Type detection for unused variables
- ESLint configuration for v9

### Infrastructure
- **CI/CD**: GitHub Actions with automated testing on Node 18, 20, 22
- **ESLint + Prettier**: Code quality and formatting
- **CodeCov**: Test coverage reporting (56.52%)
- **Pre-commit hooks**: Automatic linting before commits

## [0.2.1] - 2025-11-19

### Fixed
- CLI now correctly displays version from package.json (was hardcoded to 0.1.0)
- Removed duplicate import statements
- Dynamic version reading from package.json

## [0.2.0] - 2025-11-19

### Added
- **Extended Type System**: Automatic integer optimization (i8, i16, i32, i64)
- **Float Types**: Support for f32 and f64
- **Date Types**: Automatic detection of date and datetime strings
- **Real Tokenizer**: Integration with js-tiktoken for accurate GPT-4 token counting
- **Schema Validation**: Now validates schema across ALL objects, not just first
- **Error System**: Custom error classes with detailed context
- **5 New Tests**: Tokenizer integration tests

### Changed
- **Type Detection**: Numbers now automatically use smallest fitting type
- **Token Statistics**: Now shows real token counts instead of estimation
- **CLI**: Improved output formatting and error messages

### Fixed
- **Round-trip Conversion**: Numbers no longer converted to strings
- **Schema Detection**: Missing keys in later objects now properly detected
- **String Escaping**: Proper handling of quotes, newlines, tabs
- **Commander.js**: Fixed options parsing in v12

### Performance
- **33.9% token savings** on test data (verified with GPT-4 tokenizer)
- Scales to **50%+ savings** with 100+ items

## [0.1.0] - 2025-11-18

### Added
- Initial release
- JSON ↔ TONL conversion
- YAML ↔ TONL conversion
- CLI tool with `-s` stats flag
- Basic type detection (string, number, boolean, null)
- 39 unit tests

[0.2.0]: https://github.com/kryptomrx/tonl-mcp-bridge/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kryptomrx/tonl-mcp-bridge/releases/tag/v0.1.0