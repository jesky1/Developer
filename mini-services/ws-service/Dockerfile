# GoalZone WS Service - Docker image for Render.com / Railway
# Build context: project root (set via render.yaml)
# e.g., docker build -f mini-services/ws-service/Dockerfile .

# ---- Build Stage: Generate Prisma Client ----
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy Prisma schema
COPY prisma ./prisma/

# Switch to PostgreSQL provider for production (Supabase)
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/g' ./prisma/schema.prisma

# Install Prisma dependencies at root level and generate client
RUN bun add @prisma/client prisma && \
    bunx prisma generate --schema=./prisma/schema.prisma

# ---- Runtime Stage ----
FROM oven/bun:1

WORKDIR /app

# Copy generated Prisma client from builder (at root node_modules)
COPY --from=builder /app/node_modules ./node_modules

# Copy ws-service application code
COPY mini-services/ws-service/index.ts ./mini-services/ws-service/
COPY mini-services/ws-service/db.ts ./mini-services/ws-service/

# Install only socket.io in the ws-service directory
# @prisma/client resolves from root node_modules (no local copy needed)
WORKDIR /app/mini-services/ws-service
RUN echo '{"name":"ws-service","dependencies":{"socket.io":"^4.8.1"}}' > package.json && \
    bun install

# Render.com provides PORT via environment variable
ENV PORT=10000

# Environment variables (configured by the cloud platform)
ENV DATABASE_URL=""
ENV DATA_MODE=mock
ENV FOOTBALL_API_KEY=""

# Start the service
CMD ["bun", "index.ts"]
