# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm turbo

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages ./packages

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy application source (without node_modules to avoid symlink conflicts)
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig*.json ./apps/api/
COPY apps/api/nest-cli.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
COPY packages/*/src ./packages/
COPY tsconfig.json ./

# Generate Prisma client
RUN cd apps/api && pnpm prisma generate

# Build
RUN pnpm --filter @asforces/api build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules (argon2, etc.)
RUN apk add --no-cache openssl libssl3 python3 make g++ linux-headers

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages ./packages

# Install dependencies (including Prisma CLI and compile native modules)
RUN pnpm install --no-frozen-lockfile

# Copy built files and necessary assets
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY apps/api/prisma ./apps/api/prisma

# Generate Prisma client in production stage (before switching to node user)
RUN cd apps/api && pnpm prisma generate

# Create uploads directory and set permissions
RUN mkdir -p /app/uploads && chown -R node:node /app && chown -R node:node /app/uploads

# Switch to non-root user
USER node

EXPOSE 3000

# Run migrations and start
CMD ["sh", "-c", "cd apps/api && pnpm prisma migrate deploy && cd ../.. && node apps/api/dist/main.js"]

