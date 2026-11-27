import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

declare global {
  var prisma: PrismaClient | undefined;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const prisma =
  global.prisma ||
  new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.APP_MODE === 'prod' ? ['error'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
