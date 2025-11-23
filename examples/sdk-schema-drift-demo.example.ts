import 'dotenv/config';
import { PostgresAdapter } from '../src/sdk/sql/postgres.js';

async function main() {
  console.log('🔍 Schema Drift Monitoring Demo\n');

  const db = new PostgresAdapter({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'tonl_test',
    user: process.env.POSTGRES_USER || 'tonl_user',
    password: process.env.POSTGRES_PASSWORD || 'tonl_pass',
  });

  await db.connect();
  console.log('✅ Connected to PostgreSQL\n');

  // Track baseline schema
  console.log('📊 Tracking baseline schema for users table...');
  await db.trackSchema('users');
  console.log('✅ Baseline captured\n');

  // Check for drift (should be none)
  console.log('🔍 Checking for schema drift...');
  let drift = await db.detectSchemaDrift('users');
  
  console.log('Has changed:', drift.hasChanged);
  console.log('New columns:', drift.newColumns);
  console.log('Removed columns:', drift.removedColumns);
  console.log('Type changes:', drift.typeChanges);
  console.log('Row count change:', drift.rowCountChange);
  console.log('Savings impact:', drift.savingsImpact + '%');
  console.log('Recommendation:', drift.recommendation);
  console.log();

  // Simulate schema change
  console.log('🔧 Simulating schema change (adding column)...');
  try {
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT \'active\'');
    console.log('✅ Column added\n');
  } catch (e) {
    console.log('⚠️  Column already exists\n');
  }

  // Detect drift
  console.log('🔍 Detecting drift after change...');
  drift = await db.detectSchemaDrift('users');
  
  console.log('Has changed:', drift.hasChanged);
  console.log('New columns:', drift.newColumns);
  console.log('Removed columns:', drift.removedColumns);
  console.log('Type changes:', drift.typeChanges);
  console.log('Savings impact:', drift.savingsImpact + '%');
  console.log('Recommendation:', drift.recommendation);
  console.log();

  // Update baseline
  if (drift.hasChanged) {
    console.log('📝 Updating baseline...');
    await db.updateSchemaBaseline('users');
    console.log('✅ Baseline updated\n');
  }

  // Verify no drift after update
  console.log('🔍 Verifying no drift after baseline update...');
  drift = await db.detectSchemaDrift('users');
  console.log('Has changed:', drift.hasChanged);
  console.log('✅ Schema tracking working correctly!');

  await db.disconnect();
}

main().catch(console.error);