export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// Call shapes the logger accepts.
type LogFn = {
  (message: string): void;
  (meta: Record<string, unknown>, message: string): void;
};

export interface Logger {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  debug: LogFn;
  /** Returns a logger that merges `bound` into every entry's meta. */
  child(bound: Record<string, unknown>): Logger;
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

// Distinguish `logger.info('msg')` from `logger.info({...}, 'msg')` at runtime
// so both call shapes route to the same internal function.
const splitArgs = (
  a: Record<string, unknown> | string,
  b?: string,
): { meta?: Record<string, unknown>; message: string } => {
  if (typeof a === 'string') return { message: a };
  return { meta: a, message: b ?? '' };
};

const buildLogger = (bound: Record<string, unknown>): Logger => {
  const log = (level: LogLevel, a: Record<string, unknown> | string, b?: string): void => {
    const { meta, message } = splitArgs(a, b);

    // Canonical fields first, caller data nested under `meta` — no key
    // collisions. `bound` (from .child()) is merged under the caller meta so
    // per-call values can still override it.
    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      meta: normalizeMeta({ ...bound, ...meta }),
    };
    write(level, JSON.stringify(entry));
  };

  // Local shim typed as LogFn so the overloads are satisfied without `any`.
  const boundFn = (level: LogLevel): LogFn => {
    const fn = (a: Record<string, unknown> | string, b?: string): void => log(level, a, b);
    return fn;
  };

  return {
    info: boundFn('info'),
    warn: boundFn('warn'),
    error: boundFn('error'),
    debug: boundFn('debug'),
    child: (extra) => buildLogger({ ...bound, ...extra }),
  };
};

export const logger: Logger = buildLogger({});
