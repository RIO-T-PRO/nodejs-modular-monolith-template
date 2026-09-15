import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  //   REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  //   JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  //   JWT_EXPIRES_IN: z.string().default('1d'),
  MESSAGE_DISPATCHER: z.enum(['memory', 'redis']).default('memory'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Zod 4: error formatting moved to top-level helpers —
  // z.flattenError() replaces the old ZodError#flatten() method.
  console.error('Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
