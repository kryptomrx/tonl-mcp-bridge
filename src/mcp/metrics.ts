import client from 'prom-client';

const register = new client.Registry();

client.collectDefaultMetrics({
  prefix: 'tonl_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  register
});

export const tokensSavedTotal = new client.Counter({
  name: 'tonl_tokens_saved_total',
  help: 'Total number of tokens saved by TONL conversion since server start',
  labelNames: ['model'],
  registers: [register]
});

export const costSavingsUSD = new client.Counter({
  name: 'tonl_estimated_cost_savings_usd',
  help: 'Estimated cost savings in USD based on token savings and model pricing',
  labelNames: ['model'],
  registers: [register]
});

export const compressionRatio = new client.Histogram({
  name: 'tonl_compression_ratio',
  help: 'Compression ratio of TONL vs JSON (lower is better)',
  labelNames: ['model'],
  buckets: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  registers: [register]
});

export const conversionRequestsTotal = new client.Counter({
  name: 'tonl_conversion_requests_total',
  help: 'Total number of TONL conversion requests',
  labelNames: ['operation', 'status'],
  registers: [register]
});

export const conversionDuration = new client.Histogram({
  name: 'tonl_conversion_duration_seconds',
  help: 'Duration of TONL conversion operations in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const activeConnections = new client.Gauge({
  name: 'tonl_active_connections',
  help: 'Number of active SSE connections to the MCP server',
  registers: [register]
});

export const vectorDbOperations = new client.Counter({
  name: 'tonl_vector_db_operations_total',
  help: 'Total number of vector database operations',
  labelNames: ['database', 'operation'],
  registers: [register]
});

export const dataSize = new client.Histogram({
  name: 'tonl_data_size_bytes',
  help: 'Size of data being processed in bytes',
  labelNames: ['type'],
  buckets: [1024, 10240, 102400, 1048576, 10485760],
  registers: [register]
});

export const MODEL_PRICING: Record<string, number> = {
  'gpt-4o': 2.50,
  'gpt-4o-mini': 0.15,
  'gpt-4-turbo': 10.00,
  'o1': 15.00,
  'o1-mini': 3.00,
  'claude-opus-4': 15.00,
  'claude-sonnet-4': 3.00,
  'claude-sonnet-3.5': 3.00,
  'claude-haiku-4': 0.25,
  'gemini-2.0-flash': 0.075,
  'gemini-1.5-pro': 1.25,
  'gemini-1.5-flash': 0.075
};

export function recordTokenSavings(savedTokens: number, model: string = 'gpt-4o'): void {
  tokensSavedTotal.inc({ model }, savedTokens);
  
  const pricePerMillion = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o'];
  const costSavings = (savedTokens / 1_000_000) * pricePerMillion;
  
  costSavingsUSD.inc({ model }, costSavings);
}

export function recordCompressionRatio(jsonTokens: number, tonlTokens: number, model: string = 'gpt-4o'): void {
  const ratio = tonlTokens / jsonTokens;
  compressionRatio.observe({ model }, ratio);
}

export async function recordConversion<T>(
  operation: 'json_to_tonl' | 'tonl_to_json' | 'calculate_savings',
  fn: () => Promise<T>
): Promise<T> {
  const timer = conversionDuration.startTimer({ operation });
  
  try {
    const result = await fn();
    conversionRequestsTotal.inc({ operation, status: 'success' });
    return result;
  } catch (error) {
    conversionRequestsTotal.inc({ operation, status: 'error' });
    throw error;
  } finally {
    timer();
  }
}

export function incrementConnections(): void {
  activeConnections.inc();
}

export function decrementConnections(): void {
  activeConnections.dec();
}

export function recordVectorDbOperation(
  database: 'mongodb' | 'pinecone' | 'weaviate' | 'qdrant' | 'milvus',
  operation: 'search' | 'upsert' | 'delete' | 'query'
): void {
  vectorDbOperations.inc({ database, operation });
}

export function recordDataSize(sizeBytes: number, type: 'json_input' | 'tonl_output'): void {
  dataSize.observe({ type }, sizeBytes);
}

export function getMetricsRegistry(): client.Registry {
  return register;
}

export function resetMetrics(): void {
  register.resetMetrics();
}
