import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import type { Env } from '#config/env';

const createPrismaClient = (config: Env): PrismaClient => {
  const adapter = new PrismaPg({ connectionString: config.DATABASE_URL });
  return new PrismaClient({
    adapter,
    // Query logging in dev; errors only in prod. Keeps signal-to-noise sane.
    log: config.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });
};

export default createPrismaClient;
