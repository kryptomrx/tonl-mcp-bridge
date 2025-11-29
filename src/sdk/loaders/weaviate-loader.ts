let weaviateModule: any = null;

export async function loadWeaviateDriver(): Promise<any> {
  if (weaviateModule) return weaviateModule;

  try {
    // @ts-ignore - Optional peer dependency
    weaviateModule = await import('weaviate-client');
    return weaviateModule;
  } catch {
    throw new Error('Weaviate client not found. Install: npm install weaviate-client');
  }
}

export async function createWeaviateClient(config: {
  url?: string;
  apiKey?: string;
  scheme?: 'http' | 'https';
  host?: string;
}): Promise<any> {
  const weaviate = await loadWeaviateDriver();
  
  if (config.url) {
    return await weaviate.default.connectToWeaviateCloud({
      clusterURL: config.url,
      ...(config.apiKey && {
        options: {
          authCredentials: new weaviate.ApiKey(config.apiKey),
        },
      }),
    });
  }
  
  if (config.host === 'localhost' || config.host === '127.0.0.1') {
    return await weaviate.default.connectToLocal({
      ...(config.apiKey && {
        options: {
          authCredentials: new weaviate.ApiKey(config.apiKey),
        },
      }),
    });
  }
  
  return await weaviate.default.connectToCustom({
    httpHost: config.host || 'localhost',
    httpPort: 8080,
    httpSecure: config.scheme === 'https',
    ...(config.apiKey && {
      options: {
        authCredentials: new weaviate.ApiKey(config.apiKey),
      },
    }),
  });
}
