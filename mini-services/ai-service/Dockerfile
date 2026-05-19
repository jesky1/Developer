# GoalZone AI Service - Standalone Docker
# Compatible with Railway, Fly.io, Koyeb, and any Docker-hosting platform
# Uses its own prisma/schema.prisma (PostgreSQL provider)

FROM oven/bun:1

WORKDIR /app

# Copy prisma schema (already set to PostgreSQL)
COPY prisma ./prisma/

# Copy package files
COPY package.json ./

# Install dependencies (pins Prisma 6.x to avoid Prisma 7 breaking changes)
RUN bun install

# Generate Prisma client using the installed version (not bunx which fetches latest)
RUN bunx --bun prisma generate

# Copy application code
COPY index.ts ./
COPY db.ts ./

# Create directory for generated images
RUN mkdir -p /app/public/generated

# Cloud platforms provide PORT via environment variable
ENV PORT=10000

# Non-sensitive defaults only (secrets are set via cloud platform env vars)
ENV NODE_ENV=production
ENV GENERATED_IMAGES_DIR=/app/public/generated

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the service
CMD ["bun", "index.ts"]
