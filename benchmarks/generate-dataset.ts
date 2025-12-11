#!/usr/bin/env tsx
/**
 * Benchmark Dataset Generator
 * 
 * Generates synthetic datasets for token savings verification:
 * - users: Tabular data (5 fields)
 * - logs: Enterprise-grade event streams with VERBOSE KEYS (15 fields)
 * - rag: Mixed document retrieval (8 fields + arrays)
 * 
 * Usage:
 *   tsx benchmarks/generate-dataset.ts --type users --count 100
 *   tsx benchmarks/generate-dataset.ts --all
 */

import { faker } from '@faker-js/faker';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Command } from 'commander';

// Ensure datasets directory exists
const DATASETS_DIR = join(process.cwd(), 'benchmarks', 'datasets');
mkdirSync(DATASETS_DIR, { recursive: true });

// ============================================================================
// DATASET TYPE 1: USER RECORDS (Tabular Data)
// ============================================================================
// Matches README table: 5 fields (id, name, age, email, active)

interface UserRecord {
  id: number;
  name: string;
  age: number;
  email: string;
  active: boolean;
}

function generateUsers(count: number): UserRecord[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    age: faker.number.int({ min: 18, max: 75 }),
    email: faker.internet.email().toLowerCase(),
    active: faker.datatype.boolean()
  }));
}

// ============================================================================
// DATASET TYPE 2: ENTERPRISE LOG EVENTS (Verbose Keys)
// ============================================================================
// THIS IS WHERE TONL SHINES: Long, repetitive field names across thousands of records
//
// 15 fields with ENTERPRISE-STYLE VERBOSE NAMING:
// - timestamp_utc_iso8601
// - log_level_severity_category  
// - kubernetes_pod_name_identifier
// - http_request_method_type
// - http_response_status_code
// - request_processing_latency_milliseconds
// - upstream_service_identifier
// - distributed_trace_correlation_id
// - user_authentication_session_token
// - client_ip_address_originating_request
// - geographic_region_deployment_zone
// - application_error_message_description
// - database_query_execution_duration_ms
// - cache_lookup_result_status
// - request_payload_size_bytes

interface EnterpriseLogEvent {
  timestamp_utc_iso8601: string;
  log_level_severity_category: string;
  kubernetes_pod_name_identifier: string;
  http_request_method_type: string;
  http_response_status_code: number;
  request_processing_latency_milliseconds: number;
  upstream_service_identifier: string;
  distributed_trace_correlation_id: string;
  user_authentication_session_token: string;
  client_ip_address_originating_request: string;
  geographic_region_deployment_zone: string;
  application_error_message_description: string;
  database_query_execution_duration_ms: number;
  cache_lookup_result_status: string;
  request_payload_size_bytes: number;
}

const LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const STATUS_CODES = [200, 201, 204, 400, 401, 403, 404, 500, 502, 503, 504];
const SERVICES = ['auth-svc', 'payment-svc', 'notif-svc', 'analytics-svc', 'api-gateway'];
const REGIONS = ['us-east-1a', 'us-west-2b', 'eu-west-1c', 'ap-se-1a', 'ap-ne-1b'];
const CACHE_STATUS = ['HIT', 'MISS', 'EXPIRED', 'BYPASS'];

const ERROR_MESSAGES = [
  'OK',
  'Unauthorized',
  'Timeout',
  'Invalid token',
  'Rate limit',
  'DB connection lost'
];

function generateEnterpriseLogs(count: number): EnterpriseLogEvent[] {
  return Array.from({ length: count }, () => ({
    timestamp_utc_iso8601: faker.date.recent({ days: 7 }).toISOString(),
    log_level_severity_category: faker.helpers.arrayElement(LOG_LEVELS),
    kubernetes_pod_name_identifier: `${faker.helpers.arrayElement(SERVICES)}-v1-${faker.string.alphanumeric(5)}`,
    http_request_method_type: faker.helpers.arrayElement(HTTP_METHODS),
    http_response_status_code: faker.helpers.arrayElement(STATUS_CODES),
    request_processing_latency_milliseconds: faker.number.int({ min: 5, max: 2000 }),
    upstream_service_identifier: faker.helpers.arrayElement(SERVICES),
    distributed_trace_correlation_id: faker.string.alphanumeric(12),
    user_authentication_session_token: faker.string.alphanumeric(16),
    client_ip_address_originating_request: faker.internet.ipv4(),
    geographic_region_deployment_zone: faker.helpers.arrayElement(REGIONS),
    application_error_message_description: faker.helpers.arrayElement(ERROR_MESSAGES),
    database_query_execution_duration_ms: faker.number.int({ min: 1, max: 500 }),
    cache_lookup_result_status: faker.helpers.arrayElement(CACHE_STATUS),
    request_payload_size_bytes: faker.number.int({ min: 128, max: 8192 })
  }));
}

// ============================================================================
// DATASET TYPE 3: RAG DOCUMENTS (Mixed Use-Case)
// ============================================================================
// 8 fields: doc_id, title, content, category, tags[], author, created_at, 
//           similarity_score

interface RAGDocument {
  doc_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  created_at: string;
  similarity_score: number;
}

const CATEGORIES = ['Technology', 'Business', 'Science', 'Health', 'Finance', 'Education'];
const TAG_POOL = [
  'machine-learning', 'ai', 'cloud', 'security', 'devops', 
  'microservices', 'data-science', 'blockchain', 'iot', 'quantum',
  'cybersecurity', 'automation', 'analytics', 'api', 'database'
];

function generateRAGDocuments(count: number): RAGDocument[] {
  return Array.from({ length: count }, () => ({
    doc_id: faker.string.uuid(),
    title: faker.lorem.sentence({ min: 3, max: 8 }),
    content: faker.lorem.paragraphs({ min: 2, max: 4 }),
    category: faker.helpers.arrayElement(CATEGORIES),
    tags: faker.helpers.arrayElements(TAG_POOL, { min: 2, max: 5 }),
    author: faker.person.fullName(),
    created_at: faker.date.past({ years: 2 }).toISOString(),
    similarity_score: parseFloat(faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 3 }).toFixed(3))
  }));
}

// ============================================================================
// FILE WRITERS
// ============================================================================

function saveJSON(filename: string, data: any) {
  const filepath = join(DATASETS_DIR, filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ Generated: ${filename} (${data.length} records)`);
}

function saveNDJSON(filename: string, data: any[]) {
  const filepath = join(DATASETS_DIR, filename);
  const ndjson = data.map(record => JSON.stringify(record)).join('\n');
  writeFileSync(filepath, ndjson);
  console.log(`✅ Generated: ${filename} (${data.length} records)`);
}

// ============================================================================
// GENERATION LOGIC
// ============================================================================

function generateDataset(type: string, count: number) {
  console.log(`\n🔨 Generating ${type} dataset with ${count} records...`);
  
  switch (type) {
    case 'users':
      const users = generateUsers(count);
      saveJSON(`users-${count}.json`, users);
      break;
      
    case 'logs':
      const logs = generateEnterpriseLogs(count);
      saveNDJSON(`logs-${count}.ndjson`, logs);
      break;
      
    case 'rag':
      const docs = generateRAGDocuments(count);
      saveJSON(`rag-${count}.json`, docs);
      break;
      
    default:
      console.error(`❌ Unknown dataset type: ${type}`);
      console.error('   Valid types: users, logs, rag');
      process.exit(1);
  }
}

function generateAll() {
  console.log('\n🚀 Generating ALL benchmark datasets...\n');
  console.log('═'.repeat(60));
  
  // Users datasets (matches README table)
  console.log('\n📊 USER RECORDS (Tabular Data - 5 fields)');
  generateDataset('users', 5);
  generateDataset('users', 10);
  generateDataset('users', 100);
  generateDataset('users', 1000);
  
  // Enterprise logs with VERBOSE KEYS (where TONL shines)
  console.log('\n📝 ENTERPRISE LOG EVENTS (Verbose Keys - 15 fields)');
  generateDataset('logs', 100);
  generateDataset('logs', 1000);
  
  // RAG documents (mixed use-case)
  console.log('\n📚 RAG DOCUMENTS (Document Retrieval - 8 fields + arrays)');
  generateDataset('rag', 50);
  generateDataset('rag', 200);
  
  console.log('\n═'.repeat(60));
  console.log('\n✅ All datasets generated successfully!');
  console.log(`\n📂 Location: ${DATASETS_DIR}`);
  console.log('\n💡 Next step: Run verification');
  console.log('   npm run benchmark:verify\n');
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

const program = new Command();

program
  .name('generate-dataset')
  .description('Generate synthetic benchmark datasets for TONL token savings verification')
  .version('1.0.0');

program
  .option('-t, --type <type>', 'Dataset type: users, logs, or rag')
  .option('-c, --count <number>', 'Number of records to generate', parseInt)
  .option('-a, --all', 'Generate all preset datasets (recommended)')
  .action((options) => {
    if (options.all) {
      generateAll();
    } else if (options.type && options.count) {
      generateDataset(options.type, options.count);
    } else {
      console.error('\n❌ Error: Must specify either --all or both --type and --count\n');
      console.log('Examples:');
      console.log('  tsx benchmarks/generate-dataset.ts --all');
      console.log('  tsx benchmarks/generate-dataset.ts --type users --count 100');
      console.log('  tsx benchmarks/generate-dataset.ts --type logs --count 1000\n');
      process.exit(1);
    }
  });

program.parse();
