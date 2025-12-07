/**
 * tonl top - Live server monitoring
 * 
 * Like htop but for your TONL server!
 * Shows real-time metrics, resource usage, and business impact.
 */

import React from 'react';
import { render } from 'ink';
import { TopDashboard } from '../ui/TopDashboard.js';

export interface TopCommandOptions {
  url?: string;
  interval?: number;
  stream?: boolean; // Enable SSE streaming
  token?: string; // Auth token
}

export function topCommand(options: TopCommandOptions = {}) {
  const serverUrl = options.url || process.env.TONL_SERVER_URL || 'http://localhost:3000/metrics';
  const refreshInterval = options.interval || 1000;
  const useStream = options.stream !== false; // Default: true
  const authToken = options.token || process.env.TONL_AUTH_TOKEN; // Get token from options or env

  console.log('🚀 Starting TONL live monitor...');
  if (useStream) {
    console.log('📡 Mode: SSE Streaming (cloud-ready)');
  } else {
    console.log('⏱️  Mode: Polling');
  }
  console.log();

  // Render the dashboard using React.createElement (no JSX)
  render(
    React.createElement(TopDashboard, {
      serverUrl,
      refreshInterval,
      useStream,
      authToken,
    })
  );
}
