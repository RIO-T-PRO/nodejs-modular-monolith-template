import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  // Point to the directory (not a single file) so Prisma picks up
  // every .prisma file inside prisma/ — including models split across
  // subfolders like models/auth.prisma, models/post.prisma, etc.
  // All files are merged into one logical schema, so relations between
  // models in different files work as expected.
  schema: 'prisma/',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
