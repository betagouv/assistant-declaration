/**
 * @jest-environment node
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import concurrently from 'concurrently';

import { seedDatabase } from '@ad/src/prisma/seed';
import { PostgresContainer, setupPostgres } from '@ad/src/utils/database';

describe('database', () => {
  let postgres: PostgresContainer | undefined;
  let prisma: PrismaClient | undefined;
  let pool: Pool | undefined;

  beforeAll(async () => {
    postgres = await setupPostgres();

    process.env.DATABASE_URL = postgres.url;
    pool = new Pool({ connectionString: postgres.url });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    // Enable required extensions since not doing a proper "db:migration:deploy" below
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`;
  }, 30 * 1000);

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (pool) {
      await pool.end();
    }
    if (postgres) {
      await postgres.container.stop();
    }
  }, 30 * 1000);

  describe('prisma', () => {
    it('check schema', async () => {
      const { result } = concurrently(['npm:db:schema:check:unsecure']);
      await result;
    });

    it('migrate', async () => {
      const { result } = concurrently(['npm:db:push:unsecure']);
      await result;
    }, 15 * 1000);
  });

  it('seed database', async () => {
    if (!prisma) {
      throw new Error('prisma is not defined');
    }
    await seedDatabase(prisma);
  }, 30 * 1000);
});
