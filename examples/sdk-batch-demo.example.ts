import { PostgresAdapter } from '../src/sdk/sql/postgres.js';
import 'dotenv/config';

async function main() {
  console.log('🔄 Batch Query Demo\n');

const db = new PostgresAdapter({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'tonl_demo',
  user: process.env.POSTGRES_USER || 'tonl_user',
  password: process.env.POSTGRES_PASSWORD || 'tonl_pass',
});

  await db.connect();
  console.log('✅ Connected to PostgreSQL\n');

  // Single queries (old way)
  console.log('📊 Single queries (old way):');
  console.time('single');

  const users = await db.queryWithStats('SELECT * FROM users', 'users', {
    model: 'gpt-5',
  });
  const products = await db.queryWithStats('SELECT * FROM products', 'products', {
    model: 'gpt-5',
  });
  const orders = await db.queryWithStats('SELECT * FROM orders', 'orders', {
    model: 'gpt-5',
  });

  console.timeEnd('single');
  console.log('Users:', users.rowCount, 'rows');
  console.log('Products:', products.rowCount, 'rows');
  console.log('Orders:', orders.rowCount, 'rows');
  console.log(
    'Total saved:',
    users.stats.savedTokens + products.stats.savedTokens + orders.stats.savedTokens,
    'tokens\n'
  );

  // Batch queries (new way)
  console.log('🚀 Batch queries (new way):');
  console.time('batch');

  const result = await db.batchQueryWithStats(
    [
      { sql: 'SELECT * FROM users', name: 'users' },
      { sql: 'SELECT * FROM products', name: 'products' },
      { sql: 'SELECT * FROM orders', name: 'orders' },
    ],
    { model: 'gpt-5' }
  );

  console.timeEnd('batch');
  console.log('\n📈 Aggregate Results:');
  console.log('Total queries:', result.aggregate.totalQueries);
  console.log('Total rows:', result.aggregate.totalRows);
  console.log('Original tokens:', result.aggregate.totalOriginalTokens);
  console.log('TONL tokens:', result.aggregate.totalCompressedTokens);
  console.log('Saved:', result.aggregate.savedTokens, 'tokens');
  console.log('Savings:', result.aggregate.savingsPercent.toFixed(1) + '%\n');

  console.log('📦 Individual Results:');
  result.results.forEach((r, i) => {
    console.log(
      `  ${i + 1}. ${r.rowCount} rows, saved ${r.stats?.savedTokens} tokens (${r.stats?.savingsPercent.toFixed(1)}%)`
    );
  });

  await db.disconnect();
}

main().catch(console.error);