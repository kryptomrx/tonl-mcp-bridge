import { SQLiteAdapter } from '../src/sdk/sql/sqlite';

async function demo() {
  console.log('═'.repeat(70));
  console.log('  TONL SDK - SQLite In-Memory Demo');
  console.log('═'.repeat(70));

  const db = new SQLiteAdapter(':memory:');

  try {
    await db.connect();
    console.log('✅ Connected to SQLite (in-memory)\n');

    console.log('📝 Creating table and inserting data...');
    await db.query(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        age INTEGER,
        active INTEGER DEFAULT 1
      )
    `);

    await db.query(`
      INSERT INTO users (name, email, age, active) VALUES
      ('Alice Johnson', 'alice@example.com', 25, 1),
      ('Bob Smith', 'bob@example.com', 30, 1),
      ('Charlie Davis', 'charlie@example.com', 35, 0),
      ('Diana Wilson', 'diana@example.com', 28, 1),
      ('Eve Martinez', 'eve@example.com', 32, 1)
    `);

    console.log('✅ Data inserted\n');

    const result = await db.queryWithStats('SELECT * FROM users', 'users', {
      model: 'gpt-5',
    });

    console.log(`📊 Query: SELECT * FROM users`);
    console.log(`📦 Results: ${result.rowCount} rows\n`);

    console.log('💾 Token Statistics:');
    console.log(`   JSON:     ${result.stats.originalTokens} tokens`);
    console.log(`   TONL:     ${result.stats.compressedTokens} tokens`);
    console.log(
      `   Saved:    ${result.stats.savedTokens} tokens (${result.stats.savingsPercent.toFixed(1)}%)\n`
    );

    console.log('🎯 TONL Format (first 3 lines):');
    const lines = result.tonl.split('\n').slice(0, 4);
    console.log(lines.join('\n') + '\n   ...\n');

    await db.disconnect();
    console.log('═'.repeat(70));
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

demo();
