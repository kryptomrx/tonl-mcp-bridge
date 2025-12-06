import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { streamMetrics, MetricsSnapshot } from '../utils/metrics-parser.js';

interface TopDashboardProps {
  serverUrl?: string;
  refreshInterval?: number;
  useStream?: boolean; // NEW: Enable/disable SSE streaming
}

export function TopDashboard({ 
  serverUrl = 'http://localhost:3000/metrics',
  refreshInterval = 1000,
  useStream = true // NEW: Use SSE stream by default
}: TopDashboardProps) {
  const { exit } = useApp();
  const [snapshot, setSnapshot] = useState<MetricsSnapshot | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<MetricsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function startStream() {
      if (!useStream) {
        // Fallback to polling mode
        return startPolling();
      }

      try {
        // Use /metrics/live endpoint for streaming
        const streamUrl = serverUrl.replace('/metrics', '/metrics/live');
        
        for await (const snapshot of streamMetrics(streamUrl)) {
          if (!mounted) break;
          
          setSnapshot(snapshot);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    }

    function startPolling() {
      // Fallback: Old polling method (kept for compatibility)
      let timeoutId: NodeJS.Timeout;
      let lastSnapshot: MetricsSnapshot | null = null;

      async function update() {
        try {
          const response = await fetch(serverUrl);
          const text = await response.text();
          const { createSnapshot } = await import('../utils/metrics-parser.js');
          const newSnapshot = createSnapshot(text, lastSnapshot || undefined);
          
          if (mounted) {
            lastSnapshot = newSnapshot;
            setSnapshot(newSnapshot);
            setError(null);
            setLoading(false);
          }
        } catch (err) {
          if (mounted) {
            setError(err instanceof Error ? err.message : String(err));
            setLoading(false);
          }
        }

        if (mounted) {
          timeoutId = setTimeout(update, refreshInterval);
        }
      }

      update();
      
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    startStream();

    return () => {
      mounted = false;
    };
  }, [serverUrl, refreshInterval, useStream]);

  // Handle Ctrl+C
  useEffect(() => {
    const handler = () => exit();
    process.on('SIGINT', handler);
    return () => {
      process.off('SIGINT', handler);
    };
  }, [exit]);

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>⏳ Connecting to TONL server...</Text>
        <Text dimColor>URL: {serverUrl}</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">❌ Error: {error}</Text>
        <Text dimColor>Make sure the server is running: tonl-mcp-server</Text>
        <Text dimColor>Press Ctrl+C to exit</Text>
      </Box>
    );
  }

  if (!snapshot) {
    return <Text>No data yet...</Text>;
  }

  // Format helpers
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatUptime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const createBar = (percentage: number, width: number = 20): string => {
    const filled = Math.round((percentage / 100) * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
  };

  const getHealthColor = (healthy: boolean): string => {
    return healthy ? 'green' : 'red';
  };

  const getStatusEmoji = (healthy: boolean): string => {
    return healthy ? '🟢' : '🔴';
  };

  // Calculate derived values
  const cpuBar = createBar(snapshot.cpu.percentage || 0);
  const memBar = createBar(snapshot.memory.percentage || 0);
  const cpuColor = (snapshot.cpu.percentage || 0) > 80 ? 'red' : (snapshot.cpu.percentage || 0) > 50 ? 'yellow' : 'green';
  const memColor = (snapshot.memory.percentage || 0) > 80 ? 'red' : (snapshot.memory.percentage || 0) > 50 ? 'yellow' : 'green';

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>TONL SERVER MONITOR</Text>
        <Text>  {getStatusEmoji(snapshot.eventLoop.healthy)} </Text>
        <Text bold color={getHealthColor(snapshot.eventLoop.healthy)}>
          {snapshot.eventLoop.healthy ? 'ONLINE' : 'DEGRADED'}
        </Text>
        <Text>  v{snapshot.version}  •  {serverUrl}  •  Uptime: {formatUptime(snapshot.uptime)}</Text>
      </Box>

      {/* System Resources */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold underline>Resources:</Text>
        
        <Box>
          <Text>CPU   [</Text>
          <Text color={cpuColor}>{cpuBar}</Text>
          <Text>]  {(snapshot.cpu.percentage || 0).toFixed(1)}%</Text>
        </Box>
        
        <Box>
          <Text>RAM   [</Text>
          <Text color={memColor}>{memBar}</Text>
          <Text>]  {formatBytes(snapshot.memory.heapUsed)} / {formatBytes(snapshot.memory.heapTotal)}</Text>
        </Box>
        
        <Box>
          <Text>Lag   [</Text>
          <Text color={getHealthColor(snapshot.eventLoop.healthy)}>
            {snapshot.eventLoop.lagMs.toFixed(1)}ms
          </Text>
          <Text>]  {snapshot.eventLoop.healthy ? 'Healthy' : 'Slow!'}</Text>
        </Box>
      </Box>

      {/* Live Activity */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold underline>Live Activity:</Text>
        <Text>👥 Active Streams:    {snapshot.activeConnections}</Text>
        <Text>⚡ Conversions:       {formatNumber(snapshot.conversionsTotal)} total ({formatNumber(snapshot.conversionsSuccess)} ✓, {formatNumber(snapshot.conversionsError)} ✗)</Text>
        <Text color={snapshot.errors.total > 0 ? 'yellow' : 'green'}>
          🔥 Errors (total):    {formatNumber(snapshot.errors.total)}
        </Text>
        {snapshot.errors.total > 0 && (
          <Box flexDirection="column" marginLeft={3}>
            {snapshot.errors.auth > 0 && <Text dimColor>Auth: {snapshot.errors.auth}</Text>}
            {snapshot.errors.validation > 0 && <Text dimColor>Validation: {snapshot.errors.validation}</Text>}
            {snapshot.errors.internal > 0 && <Text dimColor>Internal: {snapshot.errors.internal}</Text>}
            {snapshot.errors.stream > 0 && <Text dimColor>Stream: {snapshot.errors.stream}</Text>}
          </Box>
        )}
      </Box>

      {/* Business Impact */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold underline>Business Impact:</Text>
        <Text>💰 Tokens Saved:      {formatNumber(Math.round(snapshot.tokensSaved))}</Text>
        <Text>💵 Cost Saved:        ${snapshot.costSaved.toFixed(4)}</Text>
        <Text>📉 Avg Compression:   {snapshot.compressionRatio.toFixed(1)}%</Text>
      </Box>

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>Press Ctrl+C to exit  •  Updates every {refreshInterval}ms</Text>
      </Box>
    </Box>
  );
}
