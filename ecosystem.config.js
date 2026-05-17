module.exports = {
  apps: [
    {
      name: 'goalzone-next',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/opt/goalzone',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres',
        JWT_SECRET: 'CHANGE_ME_JWT_SECRET_MIN_32_CHARS',
        NEXTAUTH_SECRET: 'CHANGE_ME_NEXTAUTH_SECRET_MIN_32_CHARS',
      },
      max_memory_restart: '512M',
      instances: 1,
    },
    {
      name: 'goalzone-ws',
      script: 'index.ts',
      cwd: '/opt/goalzone/mini-services/ws-service',
      interpreter: '/root/.bun/bin/bun',
      env: {
        DATABASE_URL: 'postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres',
        DATA_MODE: 'mock',
      },
      max_memory_restart: '256M',
    },
    {
      name: 'goalzone-ai',
      script: 'index.ts',
      cwd: '/opt/goalzone/mini-services/ai-service',
      interpreter: '/root/.bun/bin/bun',
      env: {
        DATABASE_URL: 'postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres',
      },
      max_memory_restart: '512M',
    },
  ],
};
