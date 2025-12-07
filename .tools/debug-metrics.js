#!/usr/bin/env node
/**
 * Debug Metrics - Check raw Prometheus output
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.TONL_AUTH_TOKEN;

async function fetchMetrics() {
  const headers = {};
  
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }

  const response = await fetch(`${API_URL}/metrics`, { headers });
  const text = await response.text();
  
  console.log('=== RAW PROMETHEUS METRICS ===\n');
  
  // Filter for key metrics
  const lines = text.split('\n');
  const relevant = lines.filter(line => 
    line.includes('process_cpu') ||
    line.includes('nodejs_heap') ||
    line.includes('process_resident') ||
    line.includes('nodejs_eventloop') ||
    line.includes('tonl_tokens') ||
    line.includes('tonl_compression') ||
    line.includes('tonl_conversion')
  );
  
  console.log(relevant.join('\n'));
}

fetchMetrics().catch(console.error);
