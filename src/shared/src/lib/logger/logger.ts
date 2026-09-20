import type { LogFn, Logger } from './interfaces/logger-interface.js';
import { normalizeMeta } from './normalize-meta.js';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * `JSON.stringify(new Error('x'))` → `{}`. This expands Error (and nested
 * `cause`) so stacks actually make it into the log line.
 */

const write = (level: LogLevel, line: string): void => {
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
};

// Distinguish `logger.info('msg')` from `logger.info({...}, 'msg')` at runtime
// so both call shapes route to the same internal function.
const splitArgs = (
  a: Record<string, unknown> | string,
  b?: string,
): { meta?: Record<string, unknown>; message: string } => {
  if (typeof a === 'string') return { message: a };
  return { meta: a, message: b ?? '' };
};

class JsonLogger implements Logger {
  constructor(private readonly bound: Record<string, unknown> = {}) {}

  info: LogFn = (a, b?: string) => this.log('info', a, b);

  warn: LogFn = (a, b?: string) => this.log('warn', a, b);

  error: LogFn = (a, b?: string) => this.log('error', a, b);

  debug: LogFn = (a, b?: string) => this.log('debug', a, b);

  child(extra: Record<string, unknown>): Logger {
    return new JsonLogger({ ...this.bound, ...extra });
  }

  private log(level: LogLevel, a: Record<string, unknown> | string, b?: string): void {
    const { meta, message } = splitArgs(a, b);

    // Canonical fields first, caller data nested under `meta` — no key
    // collisions. `bound` (from .child()) is merged under the caller meta so
    // per-call values can still override it.
    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      meta: normalizeMeta({ ...this.bound, ...meta }),
    };
    write(level, JSON.stringify(entry));
  }
}

export const logger: Logger = new JsonLogger({});
