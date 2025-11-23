import { PostgresAdapter } from '../src/sdk/sql/postgres.js';

async function main() {
  console.log('🔍 Query Analyzer Demo\n');

  const db = new PostgresAdapter({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5433'),
    database: process.env.POSTGRES_DB || 'tonl_test',
    user: process.env.POSTGRES_USER || 'tonl_user',
    password: process.env.POSTGRES_PASSWORD || 'tonl_secure_password_2024',
  });

  await db.connect();
  console.log('✅ Connected to PostgreSQL\n');

  // Analyze different queries
  const queries = [
    { sql: 'SELECT * FROM users', name: 'users' },
    { sql: 'SELECT * FROM products', name: 'products' },
    { sql: 'SELECT * FROM orders', name: 'orders' },
  ];

  console.log('📊 Query Analysis:\n');

  for (const { sql, name } of queries) {
    const analysis = await db.analyzeQuery(sql, name, { model: 'gpt-5' });

    console.log(`Query: ${sql}`);
    console.log(`  Estimated rows: ${analysis.estimatedRows}`);
    console.log(`  JSON tokens: ${analysis.estimatedJsonTokens}`);
    console.log(`  TONL tokens: ${analysis.estimatedTonlTokens}`);
    console.log(`  Savings: ${analysis.potentialSavings} tokens (${analysis.potentialSavingsPercent.toFixed(1)}%)`);
    console.log(`  Cost impact: ${analysis.costImpact} per call`);
    console.log(`  Recommendation: ${analysis.recommendation}`);
    console.log();
  }

  await db.disconnect();
}

main().catch(console.error);