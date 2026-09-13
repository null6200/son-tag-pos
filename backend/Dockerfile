# Stage 1: Build
FROM node:20-slim AS builder

# Install necessary build tools for native modules
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev && npm install -g @nestjs/cli prisma@6.18.0
COPY . ./

# Generate Prisma Client
RUN prisma generate --schema=prisma/schema.prisma

# Build the application
RUN nest build

# Stage 2: Production
FROM node:20-slim AS production

# Install OpenSSL for Prisma (required at runtime)
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only production files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Create directories for uploads and logs
RUN mkdir -p uploads logs

EXPOSE 4000

# Run the compiled JavaScript directly (not through nest CLI)
CMD ["node", "dist/main.js"]