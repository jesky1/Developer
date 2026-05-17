# GOALZONE - Deployment Guide

## Architecture
This is a **monolithic Next.js 16 application** with built-in API routes and SQLite database.
All frontend, backend, and database are in a single deployment unit.

---

## Option 1: Deploy to Vercel (Recommended)

Vercel is the easiest deployment option since this is a Next.js application.

### Prerequisites
- GitHub account
- Vercel account (https://vercel.com)

### Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "feat: GOALZONE live football scores"
   git remote add origin https://github.com/YOUR_USERNAME/goalzone.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel auto-detects Next.js
   - Add environment variables:
     - `DATABASE_URL` = `file:./db/custom.db`
   - Click **Deploy**

3. **Seed the Database**
   After deployment, run the seed script locally or via Vercel CLI:
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

### Vercel Configuration (vercel.json)
The project already includes `output: "standalone"` in `next.config.ts` for optimal Vercel deployment.

### Notes
- SQLite is file-based, so data persists within a single deployment
- For production, consider upgrading to PostgreSQL via Prisma (see below)

---

## Option 2: Deploy Backend to Railway + Frontend to Vercel

If you want to split frontend and backend:

### Backend on Railway

1. **Create a separate backend** (or use this repo with a custom start command)
2. **Set up PostgreSQL** on Railway:
   - Create a new PostgreSQL service in Railway
   - Copy the `DATABASE_URL` connection string

3. **Switch Prisma to PostgreSQL**:
   Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
   Then run:
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

4. **Deploy to Railway**:
   ```bash
   railway init
   railway up
   ```
   Set environment variables:
   - `DATABASE_URL` = your PostgreSQL connection string
   - `PORT` = 3000

### Frontend on Vercel

1. Update API base URLs in the frontend to point to Railway backend
2. Deploy the Next.js frontend to Vercel as described above

---

## Option 3: Docker Deployment

### Dockerfile
```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN npm install -g bun && bun install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npx prisma db push
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/db ./db
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  goalzone:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./db/custom.db
    volumes:
      - goalzone-db:/app/db

volumes:
  goalzone-db:
```

---

## Production PostgreSQL Migration

For production, switch from SQLite to PostgreSQL:

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Run migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

3. Set `DATABASE_URL` in your deployment platform:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/goalzone
   ```

4. Seed the database:
   ```bash
   npx tsx prisma/seed.ts
   ```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `file:./db/custom.db` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `http://localhost:3000` |

---

## Quick Start (Local Development)

```bash
# Install dependencies
bun install

# Setup database
bun run db:push

# Seed with sample data
npx tsx prisma/seed.ts

# Start development server
bun run dev
```

Open http://localhost:3000 in your browser.
