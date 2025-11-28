import type * as BetterSqlite3Types from 'better-sqlite3';

type DatabaseConstructor = new (
  filename: string,
  options?: BetterSqlite3Types.Options
) => BetterSqlite3Types.Database;

let SqliteClass: DatabaseConstructor | null = null;

export async function loadSQLiteDriver(): Promise<DatabaseConstructor> {
  if (SqliteClass) return SqliteClass;

  try {
    const module = (await import('better-sqlite3')) as any;

    if (module.default && typeof module.default === 'function') {
      SqliteClass = module.default;
    } else if (typeof module === 'function') {
      SqliteClass = module;
    } else {
      SqliteClass = module as unknown as DatabaseConstructor;
    }

    return SqliteClass!;
  } catch (e) {
    throw new Error(
      'SQLite driver not found. Install: npm install better-sqlite3\n' +
        'Note: Requires C++ compiler (xcode-select --install on macOS)'
    );
  }
}

export async function createSQLiteDatabase(
  path: string,
  options?: BetterSqlite3Types.Options
): Promise<BetterSqlite3Types.Database> {
  
  const DatabaseConstructor = await loadSQLiteDriver();
  
  return new DatabaseConstructor(path, options);
}