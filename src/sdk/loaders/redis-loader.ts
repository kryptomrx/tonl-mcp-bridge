/**
 * Redis Loader
 * Dynamically loads Redis client as an optional dependency
 */

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  database?: number;
  username?: string;
}

export interface RedisModuleInfo {
  hasSearch: boolean;
  hasJSON: boolean;
  searchVersion?: string;
  jsonVersion?: string;
}

async function verifyRedisStackModules(client: any): Promise<RedisModuleInfo> {
  try {
    const modules = await client.sendCommand(['MODULE', 'LIST']) as any[];
    
    let hasSearch = false;
    let hasJSON = false;
    let searchVersion: string | undefined;
    let jsonVersion: string | undefined;

    for (let i = 0; i < modules.length; i++) {
      const moduleName = modules[i][1]?.toString().toLowerCase();
      const moduleVersion = modules[i][3]?.toString();

      if (moduleName === 'search' || moduleName === 'ft') {
        hasSearch = true;
        searchVersion = moduleVersion;
      }
      if (moduleName === 'rejson' || moduleName === 'json') {
        hasJSON = true;
        jsonVersion = moduleVersion;
      }
    }

    if (!hasSearch) {
      throw new Error(
        'Redis Vector Search requires RediSearch module.\n' +
        '\n' +
        'Solutions:\n' +
        '  1. Use Redis Stack: docker run -d -p 6379:6379 redis/redis-stack:latest\n' +
        '  2. Use Redis Cloud: https://redis.com/try-free/\n' +
        '  3. Install RediSearch: https://redis.io/docs/stack/search/\n' +
        '\n' +
        'Note: Standard Redis (caching) is different from Redis Stack (vector search).'
      );
    }

    if (!hasJSON) {
      console.warn(
        'Warning: RedisJSON module not found. Nested object optimization will be limited.\n' +
        'Install Redis Stack for full TONL optimization: docker run -d -p 6379:6379 redis/redis-stack:latest'
      );
    }

    return { hasSearch, hasJSON, searchVersion, jsonVersion };

  } catch (error) {
    if (error instanceof Error && error.message.includes('RediSearch')) {
      throw error;
    }

    try {
      await client.sendCommand(['FT._LIST']);
      console.warn('Warning: Could not verify RedisJSON module.');
      return { hasSearch: true, hasJSON: false };
    } catch {
      let redisInfo = 'Unknown Redis version';
      try {
        const info = await client.info('server');
        const versionMatch = info.match(/redis_version:([^\r\n]+)/);
        if (versionMatch) {
          redisInfo = `Redis ${versionMatch[1]}`;
        }
      } catch {
        // Ignore
      }

      throw new Error(
        'Unable to verify Redis Stack modules.\n' +
        'Redis Vector Search requires Redis Stack or RediSearch module.\n' +
        '\n' +
        'Quick Start: docker run -d -p 6379:6379 redis/redis-stack:latest\n' +
        'Documentation: https://redis.io/docs/stack/\n' +
        `Current: ${redisInfo}`
      );
    }
  }
}

export async function loadRedis(config: RedisConfig): Promise<{
  client: any;
  moduleInfo: RedisModuleInfo;
}> {
  let redis: any;
  try {
    // @ts-ignore - Optional peer dependency
    redis = await import('redis');
  } catch (error) {
    throw new Error(
      'Redis client not installed.\n' +
      'Install with: npm install redis'
    );
  }

  const clientConfig: any = {
    socket: {
      host: config.host || 'localhost',
      port: config.port || 6379,
      reconnectStrategy: (retries: number) => {
        if (retries > 3) {
          return new Error('Max retries reached');
        }
        return Math.min(retries * 100, 3000);
      }
    }
  };

  if (config.url) {
    const client = redis.createClient({ url: config.url });
    await client.connect();
    const moduleInfo = await verifyRedisStackModules(client);
    return { client, moduleInfo };
  }

  if (config.password) {
    clientConfig.password = config.password;
  }
  if (config.username) {
    clientConfig.username = config.username;
  }
  if (config.database !== undefined) {
    clientConfig.database = config.database;
  }

  const client = redis.createClient(clientConfig);

  try {
    await client.connect();
    const moduleInfo = await verifyRedisStackModules(client);
    
    console.log('Redis Vector Search connected');
    if (moduleInfo.searchVersion) {
      console.log(`RediSearch: ${moduleInfo.searchVersion}`);
    }
    if (moduleInfo.hasJSON && moduleInfo.jsonVersion) {
      console.log(`RedisJSON: ${moduleInfo.jsonVersion} - nested optimization enabled`);
    }

    return { client, moduleInfo };

  } catch (error) {
    try {
      await client.quit();
    } catch {
      // Ignore
    }
    throw error;
  }
}
