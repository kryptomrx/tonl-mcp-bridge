# -----------------------------------------------------------------------------
# STAGE 1: Builder
# Compiles TypeScript to JavaScript
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package*.json ./
# npm ci guarantees a clean install based on lockfile
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript (outputs to /dist)
RUN npm run build

# -----------------------------------------------------------------------------
# STAGE 2: Runner
# Production runtime environment
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Install ONLY production dependencies to keep image small
COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Security: Create and use non-root user
RUN addgroup -S tonl && adduser -S tonl -G tonl
USER tonl

# Expose the MCP HTTP port
EXPOSE 3000

# Health check (optional, requires /health endpoint in server)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start the MCP HTTP/SSE Server via index.js (entry point with graceful shutdown)
CMD ["node", "dist/mcp/index.js"]