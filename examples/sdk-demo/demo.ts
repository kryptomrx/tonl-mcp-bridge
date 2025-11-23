import { PostgresAdapter } from '../../src/sdk/sql/postgres';

async function demo() {
  console.log('═'.repeat(70));
  console.log('  TONL SDK v0.6.0 - PostgreSQL Demo');
  console.log('═'.repeat(70));

  const db = new PostgresAdapter({
    host: 'localhost',
    port: 5434,
    database: 'tonl_demo',
    user: 'tonl_user',
    password: 'tonl_demo_2024',
  });

  try {
    await db.connect();
    console.log('✅ Connected to PostgreSQL\n');

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

    console.log('🎯 TONL Format (first 4 lines):');
    const lines = result.tonl.split('\n').slice(0, 5);
    console.log(lines.join('\n') + '\n   ...\n');

    await db.disconnect();
    console.log('═'.repeat(70));
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

demo();
