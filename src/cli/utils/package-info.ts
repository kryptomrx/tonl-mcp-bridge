import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getPackageVersion(): string {
  try {
    const packagePath = join(__dirname, '../../..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return packageJson.version;
  } catch (error) {
    return '1.0.0';
  }
}

export async function checkMcpServerStatus(port: number = 3000): Promise<{
  online: boolean;
  port: number;
  latency?: number;
}> {
  try {
    const start = Date.now();
    const response = await fetch(`http://localhost:${port}/metrics`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    const latency = Date.now() - start;
    
    return {
      online: response.ok,
      port,
      latency
    };
  } catch (error) {
    return {
      online: false,
      port
    };
  }
}

export function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function getStatusIndicator(online: boolean): string {
  return online ? '● Online' : '○ Offline';
}

export function getStatusColor(online: boolean): string {
  return online ? 'green' : 'gray';
}
