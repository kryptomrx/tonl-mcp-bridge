import { QdrantAdapter } from '../src/sdk/vector/qdrant.js';

async function main() {
  console.log('Testing Qdrant adapter...\n');

  // Connect to your server
  const db = new QdrantAdapter({
    url: 'http://YOUR_SERVER_IP:6333', // ← Your Server IP!
  });

  await db.connect();
  console.log('Connected!\n');

  // Create collection
  await db.createCollection('test_cities', 4);
  console.log('Created collection\n');

  // Add some data
  await db.upsert('test_cities', [
    { id: 1, vector: [0.1, 0.2, 0.3, 0.4], payload: { city: 'Berlin' } },
    { id: 2, vector: [0.2, 0.3, 0.4, 0.5], payload: { city: 'London' } },
    { id: 3, vector: [0.3, 0.4, 0.5, 0.6], payload: { city: 'Paris' } },
  ]);
  console.log('Added 3 cities\n');

  // Search with stats
  const result = await db.searchWithStats('test_cities', [0.15, 0.25, 0.35, 0.45], {
    limit: 2,
    model: 'gpt-5',
  });

  console.log('Results:', result.rowCount);
  console.log('Saved:', result.stats.savedTokens, 'tokens');
  console.log('Savings:', result.stats.savingsPercent.toFixed(1) + '%\n');
  console.log('TONL:\n', result.tonl);

  // Cleanup
  await db.deleteCollection('test_cities');
  await db.disconnect();
}

main().catch(console.error);