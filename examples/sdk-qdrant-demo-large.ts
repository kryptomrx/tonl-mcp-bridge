import { QdrantAdapter } from '../src/sdk/vector/qdrant.js';

async function main() {
  console.log('Testing with larger dataset...\n');

  const db = new QdrantAdapter({
    url: 'http://YOUR_SERVER_IP:6333',
  });

  await db.connect();
  console.log('Connected\n');

  // Create collection
  await db.createCollection('cities', 4);

  // Add 20 cities
  const cities = [
    { id: 1, vector: [0.1, 0.2, 0.3, 0.4], payload: { city: 'Berlin', country: 'Germany', population: 3645000 } },
    { id: 2, vector: [0.2, 0.3, 0.4, 0.5], payload: { city: 'London', country: 'UK', population: 8982000 } },
    { id: 3, vector: [0.3, 0.4, 0.5, 0.6], payload: { city: 'Paris', country: 'France', population: 2161000 } },
    { id: 4, vector: [0.4, 0.5, 0.6, 0.7], payload: { city: 'Madrid', country: 'Spain', population: 3223000 } },
    { id: 5, vector: [0.5, 0.6, 0.7, 0.8], payload: { city: 'Rome', country: 'Italy', population: 2873000 } },
    { id: 6, vector: [0.6, 0.7, 0.8, 0.9], payload: { city: 'Amsterdam', country: 'Netherlands', population: 821752 } },
    { id: 7, vector: [0.7, 0.8, 0.9, 0.1], payload: { city: 'Vienna', country: 'Austria', population: 1897000 } },
    { id: 8, vector: [0.8, 0.9, 0.1, 0.2], payload: { city: 'Prague', country: 'Czech Republic', population: 1309000 } },
    { id: 9, vector: [0.9, 0.1, 0.2, 0.3], payload: { city: 'Brussels', country: 'Belgium', population: 1208542 } },
    { id: 10, vector: [0.1, 0.3, 0.5, 0.7], payload: { city: 'Copenhagen', country: 'Denmark', population: 602481 } },
    { id: 11, vector: [0.2, 0.4, 0.6, 0.8], payload: { city: 'Stockholm', country: 'Sweden', population: 975904 } },
    { id: 12, vector: [0.3, 0.5, 0.7, 0.9], payload: { city: 'Oslo', country: 'Norway', population: 693494 } },
    { id: 13, vector: [0.4, 0.6, 0.8, 0.1], payload: { city: 'Helsinki', country: 'Finland', population: 648042 } },
    { id: 14, vector: [0.5, 0.7, 0.9, 0.2], payload: { city: 'Warsaw', country: 'Poland', population: 1790658 } },
    { id: 15, vector: [0.6, 0.8, 0.1, 0.3], payload: { city: 'Budapest', country: 'Hungary', population: 1752286 } },
    { id: 16, vector: [0.7, 0.9, 0.2, 0.4], payload: { city: 'Dublin', country: 'Ireland', population: 554554 } },
    { id: 17, vector: [0.8, 0.1, 0.3, 0.5], payload: { city: 'Lisbon', country: 'Portugal', population: 504718 } },
    { id: 18, vector: [0.9, 0.2, 0.4, 0.6], payload: { city: 'Athens', country: 'Greece', population: 664046 } },
    { id: 19, vector: [0.1, 0.4, 0.7, 0.9], payload: { city: 'Zurich', country: 'Switzerland', population: 421878 } },
    { id: 20, vector: [0.2, 0.5, 0.8, 0.1], payload: { city: 'Munich', country: 'Germany', population: 1471508 } },
  ];

  await db.upsert('cities', cities);
  console.log('Added 20 cities\n');

  // Search with stats
  const result = await db.searchWithStats('cities', [0.15, 0.25, 0.35, 0.45], {
    limit: 15,
    model: 'gpt-5',
  });

  console.log('Found:', result.rowCount, 'cities');
  console.log('Saved:', result.stats.savedTokens, 'tokens');
  console.log('Savings:', result.stats.savingsPercent.toFixed(1) + '%');
  console.log('\nOriginal JSON:', result.stats.originalTokens, 'tokens');
  console.log('TONL format:', result.stats.compressedTokens, 'tokens\n');
  
  console.log('TONL output:\n');
  console.log(result.tonl);

  // Cleanup
  await db.deleteCollection('cities');
  await db.disconnect();
}

main().catch(console.error);