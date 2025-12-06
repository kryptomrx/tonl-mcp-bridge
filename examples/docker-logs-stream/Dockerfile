FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source
COPY . .

# Run streamer
CMD ["node", "stream-docker-logs.js", "${CONTAINER_NAME}"]
