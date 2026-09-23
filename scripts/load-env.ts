// Purpose: populate `process.env` from the repo-root `.env` file BEFORE
// any application code runs.
//
// This is loaded via Node's `-r` (require/preload) flag from package scripts,
// NOT imported by any package. `-r` preloads execute before Node even starts
// evaluating the actual entrypoint module (e.g. src/server.ts) or anything
// it imports — so by the time @template/shared's env.ts reads process.env,
// it's already fully populated. This works regardless of which package
// happens to import `shared` first, because process.env is one global
// object shared by the whole process, not per-package.

import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve the .env path relative to THIS FILE's location, not process.cwd().
// cwd changes depending on how the script is invoked (pnpm --filter sets
// cwd to the package dir, plain `node` from root doesn't, etc.) — anchoring
// to import.meta.url makes this path resolution independent of that.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, '../.env');

// `config()` loads the raw key=value pairs from .env into process.env.
// `expand()` is required on top of that because plain dotenv does NOT
// interpolate ${DB_USER}-style references inside other values (e.g.
// DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/...).
// Without expand(), DATABASE_URL would literally contain the unexpanded
// "${DB_USER}" string instead of "postgres".
expand(config({ path: rootEnvPath }));
