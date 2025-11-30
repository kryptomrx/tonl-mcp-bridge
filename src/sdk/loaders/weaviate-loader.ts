let weaviateModule: any = null;

export async function loadWeaviateDriver(): Promise<any> {
  if (weaviateModule) return weaviateModule;

  try {
    // @ts-ignore - Optional peer dependency
    weaviateModule = await import('weaviate-client');
    return weaviateModule;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Weaviate client not found. Install with: npm install weaviate-client\nDetails: ${message}`
    );
  }
}

export async function createWeaviateClient(config: {
  url?: string;
  apiKey?: string;
  scheme?: 'http' | 'https';
  host?: string;
}): Promise<any> {
  const weaviate = await loadWeaviateDriver();
  
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to connect to Weaviate: ${message}`);
  }
}
