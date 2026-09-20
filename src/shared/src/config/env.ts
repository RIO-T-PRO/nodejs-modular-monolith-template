import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4001),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    // Optional at the schema level; the refinement below enforces it only
    // when MESSAGE_DISPATCHER=redis.
    REDIS_URL: z.url().optional(),
    MESSAGE_DISPATCHER: z.enum(['memory', 'redis']).default('memory'),
  })
  .refine((v) => v.MESSAGE_DISPATCHER !== 'redis' || !!v.REDIS_URL, {
    message: 'REDIS_URL is required when MESSAGE_DISPATCHER=redis',
    path: ['REDIS_URL'],
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Zod 4: error formatting moved to top-level helpers —
  // z.flattenError() replaces the old ZodError#flatten() method.
  console.error('Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;

/** Shape of the validated env object. Use this instead of `typeof env` at call sites. */
export type Env = typeof env;
