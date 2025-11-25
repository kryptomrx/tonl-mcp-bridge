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

# Start the MCP HTTP/SSE Server
CMD ["node", "dist/mcp/server.js"]