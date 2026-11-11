# ==============================================================================
# StockFlow Server - Production Multi-Stage Dockerfile (Express + Prisma)
# ==============================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ------------------------------------------------------------------------------
# Stage 1: Install Dependencies
# ------------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

# Copy root monorepo manifests and lockfile
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies using npm ci for server workspace
RUN npm ci --workspace=server

# ------------------------------------------------------------------------------
# Stage 2: Generate Prisma Client & Compile TypeScript
# ------------------------------------------------------------------------------
FROM deps AS builder
WORKDIR /app

# Copy server source code (leaves installed node_modules intact)
COPY server ./server

ENV PATH="/app/server/node_modules/.bin:/app/node_modules/.bin:$PATH"

WORKDIR /app/server

# Generate Prisma Client binary engine
RUN npx prisma generate

# Compile TypeScript to JavaScript in /app/server/dist
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Production Runner
# ------------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV PATH="/app/server/node_modules/.bin:/app/node_modules/.bin:$PATH"

# Security: Create non-root system user and group
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

# Copy generated Prisma engine, production node_modules, compiled dist, and prisma schemas
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/server/dist ./server/dist
COPY --from=builder --chown=appuser:appgroup /app/server/prisma ./server/prisma
COPY --from=builder --chown=appuser:appgroup /app/server/package.json ./server/package.json

WORKDIR /app/server

# Switch to non-root user
USER appuser

EXPOSE 5000

# Container healthcheck using backend /health API endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/v1/health || exit 1

# Automatically execute safe database migrations before starting the Express server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
