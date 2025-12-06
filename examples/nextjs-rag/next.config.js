/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['qdrant-client'],
  },
};

export default nextConfig;
