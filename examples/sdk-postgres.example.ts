import { PostgresAdapter } from '../src/sdk/sql/postgres';

async function example() {
  // Demo credentials - replace with your own
  const db = new PostgresAdapter({
    host: 'YOUR_SERVER_IP',
    port: 5433,
    database: 'tonl_test',
    user: 'tonl_user',
    password: 'tonl_secure_password_2024',
  });

  await db.connect();
  console.log('✅ Connected to PostgreSQL\n');

  // Simple query
  const result = await db.query('SELECT * FROM users LIMIT 5');
  console.log(`Found ${result.rowCount} users`);

  // Query with TONL conversion
  const tonlResult = await db.queryToTonl('SELECT * FROM users', 'users');
  console.log('\nTONL Format:');
  console.log(tonlResult.tonl.split('\n').slice(0, 4).join('\n'));

  // Query with token statistics
  const statsResult = await db.queryWithStats('SELECT * FROM users', 'users', {
    model: 'gpt-5',
  });
  console.log('\n📊 Token Statistics:');
  console.log(`   JSON: ${statsResult.stats.originalTokens} tokens`);
  console.log(`   TONL: ${statsResult.stats.compressedTokens} tokens`);
  console.log(`   Saved: ${statsResult.stats.savingsPercent.toFixed(1)}%`);

  await db.disconnect();
}

example();