FROM node:20-slim

# Install necessary build tools for native modules
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only backend sources into /app
COPY backend/package*.json ./
# Install with devDependencies so Nest CLI is available for build
RUN npm install --include=dev && npm install -g @nestjs/cli prisma@6.18.0
COPY backend/. ./

# Generate Prisma Client at build time so engine binaries are bundled
RUN prisma generate --schema=prisma/schema.prisma

# Build (no DB access required here)
RUN nest build

EXPOSE 4000

# Start the application (Prisma generate/migrate will run in Render postdeploy)
CMD ["npm", "run", "start:prod"]