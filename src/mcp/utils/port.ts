import net from 'net';

/**
 * Checks if a port is available
 */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false); // Other errors -> treat as unavailable
      }
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port);
  });
}

/**
 * Finds the next available port starting from startPort
 * Scans a range of 100 ports by default.
 */
export async function getAvailablePort(startPort: number, range = 100): Promise<number> {
  let port = startPort;
  const maxPort = startPort + range;

  while (port < maxPort) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }

  throw new Error(`No available port found between ${startPort} and ${maxPort}`);
}
