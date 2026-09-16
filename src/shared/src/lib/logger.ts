export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

/**
 * `JSON.stringify(new Error('x'))` → `{}`. This expands Error (and nested
 * `cause`) so stacks actually make it into the log line.
 */
const serializeError = (e: unknown): unknown => {
  if (!(e instanceof Error)) return e;
  return {
    name: e.name,
    message: e.message,
    stack: e.stack,
    ...(e.cause !== undefined ? { cause: serializeError(e.cause) } : {}),
  };
};

const normalizeMeta = (meta?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    out[key] = value instanceof Error ? serializeError(value) : value;
  }
  return out;
};

const write = (level: LogLevel, line: string): void => {
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
};

const log = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
  // Canonical fields first, caller data nested under `meta` — no key collisions.
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    meta: normalizeMeta(meta),
  };
  write(level, JSON.stringify(entry));
};

export const logger: Logger = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
  debug: (message, meta) => log('debug', message, meta),
};
