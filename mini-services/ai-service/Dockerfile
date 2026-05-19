# GoalZone AI Service - Docker image for Render.com / Railway
# Build context: project root (set via render.yaml)
# e.g., docker build -f mini-services/ai-service/Dockerfile .

# ---- Stage 1: Install dependencies ----
FROM oven/bun:1 AS deps

WORKDIR /app

# Copy prisma schema from monorepo root
COPY prisma/ /app/prisma/

# Switch to PostgreSQL provider for production (Supabase)
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/g' /app/prisma/schema.prisma

# Copy package files
COPY mini-services/ai-service/package.json ./
COPY mini-services/ai-service/bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Generate Prisma client (with PostgreSQL provider)
RUN bunx prisma generate --schema=/app/prisma/schema.prisma

# ---- Stage 2: Runtime ----
FROM oven/bun:1

WORKDIR /app

# Copy node_modules with generated Prisma client
COPY --from=deps /app/node_modules ./node_modules

# Copy prisma schema (needed at runtime)
COPY prisma/ /app/prisma/

# Copy application code
COPY mini-services/ai-service/package.json ./
COPY mini-services/ai-service/index.ts ./
COPY mini-services/ai-service/db.ts ./

# Create directory for generated images
RUN mkdir -p /app/public/generated

# Render.com provides PORT via environment variable
ENV PORT=10000

# Set defaults
ENV NODE_ENV=production
ENV GENERATED_IMAGES_DIR=/app/public/generated

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the service
CMD ["bun", "index.ts"]
