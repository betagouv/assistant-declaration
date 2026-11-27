import dotenv from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 resolves `env("DATABASE_URL")` while loading the config, even for `prisma generate`
dotenv.config({ path: '.env.test' });

export default defineConfig({
  schema: 'src/prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'src/prisma/migrations',
    seed: 'tsx src/prisma/seed.script.ts',
  },
});
