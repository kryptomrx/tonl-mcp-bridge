import { createReadStream, createWriteStream } from 'fs';
import { createInterface } from 'readline';

/**
 * Stream large JSON files and convert line-by-line
 */
export async function streamJsonToTonl(
  inputPath: string,
  outputPath: string,
  collectionName: string = 'data'
): Promise<void> {
  const readStream = createReadStream(inputPath, { encoding: 'utf-8' });
  const writeStream = createWriteStream(outputPath);
  
  let isFirstLine = true;
  let buffer = '';
  let itemCount = 0;
  const items: any[] = [];

  // Read file line by line
  const rl = createInterface({
    input: readStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    buffer += line.trim();
    
    // Skip empty lines
    if (!buffer) continue;
    
    // Try to parse complete JSON objects
    try {
      // Remove array brackets if present
      const cleaned = buffer.replace(/^\[|\]$/g, '').replace(/,$/, '');
      
      if (cleaned && cleaned !== '') {
        const obj = JSON.parse(cleaned);
        items.push(obj);
        itemCount++;
        buffer = '';
      }
    } catch {
      // Not complete yet, continue buffering
    }
  }

  // Now we have all items, convert to TONL
  // (In real streaming, this would be chunked)
  const { jsonToTonl } = await import('./json-to-tonl.js');
  const tonl = jsonToTonl(items, collectionName);
  
  writeStream.write(tonl);
  writeStream.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}