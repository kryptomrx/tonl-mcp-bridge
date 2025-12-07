/**
 * Prometheus Metrics Parser
 * 
 * Parses Prometheus text format into structured data.
 * Simple, zero-dependency parser for the CLI.
 */

export interface ParsedMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  value: number;
  labels?: Record<string, string>;
}

export interface MetricsSnapshot {
  // System metrics
  cpu: {
    userSeconds: number;
    systemSeconds: number;
    percentage?: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    percentage?: number;
  };
  eventLoop: {
    lagMs: number;
    healthy: boolean;
  };
  
  // Server metrics
  uptime: number;
  activeConnections: number;
  
  // TONL business metrics
  tokensProcessed: number;
  tokensSaved: number;
  costSaved: number;
  compressionRatio: number;
  
  // Operations
  conversionsTotal: number;
  conversionsSuccess: number;
  conversionsError: number;
  
  // Errors
  errors: {
    auth: number;
    validation: number;
    internal: number;
    stream: number;
    total: number;
  };
  
  // Build info
  version: string;
  
  // Raw metrics for advanced usage
  raw: ParsedMetric[];
}

/**
 * Parse Prometheus text format
 */
export function parsePrometheusMetrics(text: string): ParsedMetric[] {
  const lines = text.split('\n');
  const metrics: ParsedMetric[] = [];
  let currentMetric: Partial<ParsedMetric> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Parse HELP
    if (trimmed.startsWith('# HELP')) {
      const parts = trimmed.split(' ');
      currentMetric.name = parts[2];
      currentMetric.help = parts.slice(3).join(' ');
      continue;
    }
    
    // Parse TYPE
    if (trimmed.startsWith('# TYPE')) {
      const parts = trimmed.split(' ');
      currentMetric.type = parts[3] as ParsedMetric['type'];
      continue;
    }
    
    // Skip other comments
    if (trimmed.startsWith('#')) continue;
    
    // Parse metric line
    const metricMatch = trimmed.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*?)(?:\{([^}]+)\})?\s+([^\s]+)(?:\s+(\d+))?$/);
    
    if (metricMatch) {
      const [, name, labelsStr, value] = metricMatch;
      
      // Parse labels
      let labels: Record<string, string> | undefined;
      if (labelsStr) {
        labels = {};
        const labelPairs = labelsStr.split(',');
        for (const pair of labelPairs) {
          const [key, val] = pair.split('=');
          if (key && val) {
            labels[key.trim()] = val.trim().replace(/"/g, '');
          }
        }
      }
      
      metrics.push({
        name,
        type: currentMetric.type || 'gauge',
        help: currentMetric.help || '',
        value: parseFloat(value),
        labels,
      });
      
      // Reset for next metric
      currentMetric = {};
    }
  }
  
  return metrics;
}

/**
 * Find metric by name (and optional label filter)
 */
export function findMetric(
  metrics: ParsedMetric[],
  name: string,
  labelFilter?: Record<string, string>
): ParsedMetric | undefined {
  return metrics.find(m => {
    if (m.name !== name) return false;
    
    if (labelFilter) {
      if (!m.labels) return false;
      
      for (const [key, value] of Object.entries(labelFilter)) {
        if (m.labels[key] !== value) return false;
      }
    }
    
    return true;
  });
}

/**
 * Sum all metrics with the same name
 */
export function sumMetrics(metrics: ParsedMetric[], name: string): number {
  return metrics
    .filter(m => m.name === name)
    .reduce((sum, m) => sum + m.value, 0);
}

/**
 * Create a structured snapshot from raw metrics
 */
export function createSnapshot(text: string, previousSnapshot?: MetricsSnapshot): MetricsSnapshot {
  const metrics = parsePrometheusMetrics(text);
  
  // Helper to safely get metric value
  const getValue = (name: string, labels?: Record<string, string>): number => {
    const metric = findMetric(metrics, name, labels);
    return metric?.value ?? 0;
  };
  
  // System metrics
  const processStartTime = getValue('tonl_process_start_time_seconds') || getValue('process_start_time_seconds');
  const uptime = processStartTime > 0 ? Date.now() / 1000 - processStartTime : 0;
  
  const cpuUser = getValue('tonl_process_cpu_user_seconds_total') || getValue('process_cpu_user_seconds_total');
  const cpuSystem = getValue('tonl_process_cpu_system_seconds_total') || getValue('process_cpu_system_seconds_total');
  
  // Calculate CPU percentage (if we have previous snapshot)
  let cpuPercentage: number | undefined;
  if (previousSnapshot && previousSnapshot.uptime > 0) {
    const timeDelta = uptime - previousSnapshot.uptime;
    const cpuDelta = (cpuUser + cpuSystem) - 
                     (previousSnapshot.cpu.userSeconds + previousSnapshot.cpu.systemSeconds);
    cpuPercentage = timeDelta > 0 ? (cpuDelta / timeDelta) * 100 : 0;
  }
  
  const heapUsed = getValue('tonl_nodejs_heap_size_used_bytes') || getValue('nodejs_heap_size_used_bytes');
  const heapTotal = getValue('tonl_nodejs_heap_size_total_bytes') || getValue('nodejs_heap_size_total_bytes');
  const rss = getValue('tonl_process_resident_memory_bytes') || getValue('process_resident_memory_bytes');
  const memPercentage = heapTotal > 0 ? (heapUsed / heapTotal) * 100 : 0;
  
  const eventLoopLag = (getValue('tonl_nodejs_eventloop_lag_seconds') || getValue('nodejs_eventloop_lag_seconds')) * 1000; // Convert to ms
  
  // TONL metrics
  const tokensSaved = sumMetrics(metrics, 'tonl_tokens_saved_total');
  const costSaved = sumMetrics(metrics, 'tonl_estimated_cost_savings_usd');
  
  // Compression ratio (average across all models)
  const compressionMetrics = metrics.filter(m => m.name === 'tonl_compression_ratio_sum');
  const compressionCount = metrics.filter(m => m.name === 'tonl_compression_ratio_count');
  const compressionSum = sumMetrics(metrics, 'tonl_compression_ratio_sum');
  const compressionCountTotal = sumMetrics(metrics, 'tonl_compression_ratio_count');
  const compressionRatio = compressionCountTotal > 0 ? compressionSum / compressionCountTotal : 0;
  
  // Conversions
  const conversionsSuccess = getValue('tonl_conversion_requests_total', { status: 'success' });
  const conversionsError = getValue('tonl_conversion_requests_total', { status: 'error' });
  const conversionsTotal = conversionsSuccess + conversionsError;
  
  // Errors by type
  const errorsAuth = getValue('tonl_errors_total', { type: 'auth' });
  const errorsValidation = getValue('tonl_errors_total', { type: 'validation' });
  const errorsInternal = getValue('tonl_errors_total', { type: 'internal' });
  const errorsStream = getValue('tonl_errors_total', { type: 'stream' });
  const errorsTotal = errorsAuth + errorsValidation + errorsInternal + errorsStream;
  
  // Build info
  const versionMetric = findMetric(metrics, 'tonl_build_info');
  const version = versionMetric?.labels?.version || 'unknown';
  
  return {
    cpu: {
      userSeconds: cpuUser,
      systemSeconds: cpuSystem,
      percentage: cpuPercentage,
    },
    memory: {
      heapUsed,
      heapTotal,
      rss,
      percentage: memPercentage,
    },
    eventLoop: {
      lagMs: eventLoopLag,
      healthy: eventLoopLag < 100, // <100ms is healthy
    },
    uptime,
    activeConnections: getValue('tonl_active_connections'),
    tokensProcessed: conversionsTotal,
    tokensSaved,
    costSaved,
    compressionRatio: compressionRatio * 100, // Convert to percentage
    conversionsTotal,
    conversionsSuccess,
    conversionsError,
    errors: {
      auth: errorsAuth,
      validation: errorsValidation,
      internal: errorsInternal,
      stream: errorsStream,
      total: errorsTotal,
    },
    version,
    raw: [], // Don't store raw metrics to prevent memory leak
  };
}

/**
 * Fetch metrics from server
 */
export async function fetchMetrics(url: string = 'http://localhost:3000/metrics'): Promise<string> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch metrics: ${response.status} ${response.statusText}`);
  }
  
  return await response.text();
}

/**
 * Fetch metrics from server via SSE stream (live updates)
 */
export async function* streamMetrics(
  url: string = 'http://localhost:3000/metrics/live',
  authToken?: string
): AsyncGenerator<MetricsSnapshot> {
  let previousSnapshot: MetricsSnapshot | null = null;

  // Build headers
  const headers: Record<string, string> = {
    'Accept': 'text/event-stream',
  };
  
  // Add auth header if token provided
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Use fetch with streaming
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to connect to metrics stream: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const MAX_BUFFER_SIZE = 100000; // 100KB max buffer

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Safety: Prevent buffer from growing too large
      if (buffer.length > MAX_BUFFER_SIZE) {
        console.warn('SSE buffer exceeded limit, clearing...');
        buffer = buffer.slice(-MAX_BUFFER_SIZE); // Keep last 100KB only
      }
      
      // Process complete events (SSE format: "data: {...}\n\n")
      const events = buffer.split('\n\n');
      buffer = events.pop() || ''; // Keep incomplete event in buffer
      
      for (const event of events) {
        if (!event.trim() || !event.startsWith('data: ')) continue;
        
        try {
          const jsonStr = event.substring(6); // Remove "data: " prefix
          const message = JSON.parse(jsonStr);
          
          if (message.type === 'metrics' && message.data) {
            const snapshot = createSnapshot(message.data, previousSnapshot || undefined);
            previousSnapshot = snapshot;
            yield snapshot;
          }
        } catch (err) {
          // Skip malformed events
          console.error('Failed to parse SSE event:', err);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
