import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../logger.js';

/* -------------------------------- Spies --------------------------------- */

interface Spy {
  mock: { calls: unknown[][] };
}

let logSpy: Spy;
let errorSpy: Spy;

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ------------------------------- Helpers -------------------------------- */

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      `Expected a plain object, got ${Array.isArray(value) ? 'array' : typeof value}`,
    );
  }
  return value as Record<string, unknown>;
};

const readLine = (raw: unknown): Record<string, unknown> => {
  if (typeof raw !== 'string') {
    throw new Error(`Expected logger to write a string, got ${typeof raw}`);
  }
  const parsed: unknown = JSON.parse(raw);
  return asRecord(parsed);
};

const lastEntry = (spy: Spy): Record<string, unknown> => {
  const calls = spy.mock.calls;
  const last = calls[calls.length - 1];
  if (!last) throw new Error('Spy was not called');
  return readLine(last[0]);
};

const firstEntry = (spy: Spy): Record<string, unknown> => {
  const first = spy.mock.calls[0];
  if (!first) throw new Error('Spy was not called');
  return readLine(first[0]);
};

/* ------------------------------- Routing -------------------------------- */

describe('logger — level routing', () => {
  it('routes info → console.log', () => {
    logger.info('hello');
    expect(logSpy.mock.calls).toHaveLength(1);
    expect(errorSpy.mock.calls).toHaveLength(0);
  });

  it('routes debug → console.log', () => {
    logger.debug('d');
    expect(logSpy.mock.calls).toHaveLength(1);
    expect(errorSpy.mock.calls).toHaveLength(0);
  });

  it('routes warn → console.error', () => {
    logger.warn('w');
    expect(errorSpy.mock.calls).toHaveLength(1);
    expect(logSpy.mock.calls).toHaveLength(0);
  });

  it('routes error → console.error', () => {
    logger.error('e');
    expect(errorSpy.mock.calls).toHaveLength(1);
    expect(logSpy.mock.calls).toHaveLength(0);
  });
});

/* ------------------------------ Call shapes ----------------------------- */

describe('logger — call shapes', () => {
  it('accepts a bare message string (no meta key emitted)', () => {
    logger.info('just a message');
    const entry = lastEntry(logSpy);
    expect(entry).toMatchObject({
      level: 'info',
      message: 'just a message',
    });
    expect('meta' in entry).toBe(false);
  });

  it('accepts (meta, message)', () => {
    logger.info({ userId: 'u1' }, 'user signed in');
    const entry = lastEntry(logSpy);
    expect(entry).toMatchObject({
      level: 'info',
      message: 'user signed in',
      meta: { userId: 'u1' },
    });
  });

  it('accepts meta with an explicit empty message', () => {
    logger.info({ a: 1 }, '');
    const entry = lastEntry(logSpy);
    expect(entry).toMatchObject({ message: '', meta: { a: 1 } });
  });

  it('accepts meta-only (message defaults to empty string)', () => {
    // Compiles because LogFn's meta overload declares `message?`.
    logger.info({ a: 1 });
    const entry = lastEntry(logSpy);
    expect(entry).toMatchObject({ message: '', meta: { a: 1 } });
  });

  it('writes an ISO-8601 timestamp', () => {
    logger.info('x');
    const entry = lastEntry(logSpy);
    const ts = entry.timestamp;
    expect(typeof ts).toBe('string');
    expect(new Date(ts as string).toISOString()).toBe(ts);
  });

  it('writes a fresh timestamp per call', async () => {
    logger.info('a');
    const t1 = lastEntry(logSpy).timestamp;
    await new Promise((r) => setTimeout(r, 5));
    logger.info('b');
    const t2 = lastEntry(logSpy).timestamp;
    expect(t2).not.toBe(t1);
  });
});

/* ------------------------- Error serialization -------------------------- */

describe('logger — error serialization in meta', () => {
  it('expands a top-level Error in meta', () => {
    const err = new Error('boom');
    logger.error({ err }, 'failed');
    const entry = lastEntry(errorSpy);
    const meta = asRecord(entry.meta);
    expect(meta.err).toMatchObject({
      name: 'Error',
      message: 'boom',
      stack: expect.any(String),
    });
  });

  it('serializes nested causes', () => {
    const root = new Error('root');
    const top = new Error('top', { cause: root });
    logger.error({ err: top }, 'failed');
    const entry = lastEntry(errorSpy);
    const serializedTop = asRecord(asRecord(entry.meta).err);
    expect(serializedTop.message).toBe('top');
    expect(asRecord(serializedTop.cause)).toMatchObject({ message: 'root' });
  });

  it('preserves a custom instance name on the serialized error', () => {
    class UserNotFoundError extends Error {
      constructor(msg: string) {
        super(msg);
        this.name = 'UserNotFoundError';
      }
    }
    logger.error({ err: new UserNotFoundError('gone') }, 'miss');
    const entry = lastEntry(errorSpy);
    const serialized = asRecord(asRecord(entry.meta).err);
    expect(serialized.name).toBe('UserNotFoundError');
  });
});

/* -------------------------------- child() ------------------------------- */

describe('logger.child', () => {
  it('returns a logger with the same interface', () => {
    const child = logger.child({ requestId: 'r1' });
    expect(typeof child.info).toBe('function');
    expect(typeof child.warn).toBe('function');
    expect(typeof child.error).toBe('function');
    expect(typeof child.debug).toBe('function');
    expect(typeof child.child).toBe('function');
  });

  it('includes bound fields on every child log', () => {
    const child = logger.child({ requestId: 'r1' });
    child.info('hi');
    const entry = lastEntry(logSpy);
    expect(entry.meta).toMatchObject({ requestId: 'r1' });
  });

  it('does not leak bound fields to the parent', () => {
    const child = logger.child({ requestId: 'r1' });
    child.info('from child');
    logger.info('from parent');
    const parentEntry = lastEntry(logSpy);
    expect('meta' in parentEntry).toBe(false);
  });

  it('lets per-call meta override bound fields', () => {
    const child = logger.child({ requestId: 'r1', userId: 'u1' });
    child.info({ requestId: 'r2' }, 'override');
    const entry = lastEntry(logSpy);
    expect(entry.meta).toMatchObject({ requestId: 'r2', userId: 'u1' });
  });

  it('nests grandchildren and merges bindings', () => {
    const child = logger.child({ requestId: 'r1' });
    const grand = child.child({ userId: 'u1' });
    grand.info('deep');
    const entry = lastEntry(logSpy);
    expect(entry.meta).toMatchObject({ requestId: 'r1', userId: 'u1' });
  });

  it('overrides parent bindings with child bindings of the same key', () => {
    const child = logger.child({ requestId: 'r1' });
    const grand = child.child({ requestId: 'r2' });
    grand.info('x');
    const entry = lastEntry(logSpy);
    expect(asRecord(entry.meta).requestId).toBe('r2');
  });

  it('serializes Errors in bound meta too', () => {
    const bound = new Error('boot failure');
    const child = logger.child({ err: bound });
    child.info('starting');
    const entry = lastEntry(logSpy);
    const serialized = asRecord(asRecord(entry.meta).err);
    expect(serialized).toMatchObject({ name: 'Error', message: 'boot failure' });
  });
});

/* ------------------------------ Output shape ---------------------------- */

describe('logger — output shape', () => {
  it('writes a single JSON line per call', () => {
    logger.info('one line');
    expect(logSpy.mock.calls).toHaveLength(1);
    const arg = logSpy.mock.calls[0]?.[0];
    expect(typeof arg).toBe('string');
    expect((arg as string).includes('\n')).toBe(false);
  });

  it('produces a stable top-level shape when meta is present', () => {
    logger.warn({ a: 1 }, 'msg');
    const entry = lastEntry(errorSpy);
    expect(Object.keys(entry).sort()).toEqual(['level', 'message', 'meta', 'timestamp'].sort());
  });

  it('produces a stable top-level shape when meta is absent', () => {
    logger.info('bare');
    const entry = lastEntry(logSpy);
    expect(Object.keys(entry).sort()).toEqual(['level', 'message', 'timestamp'].sort());
  });

  it('keeps canonical fields out of meta (no key collisions)', () => {
    logger.info({ level: 'fake', message: 'fake', timestamp: 'fake' }, 'real');
    const entry = lastEntry(logSpy);
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('real');
    expect(entry.timestamp).not.toBe('fake');
    expect(entry.meta).toMatchObject({
      level: 'fake',
      message: 'fake',
      timestamp: 'fake',
    });
  });

  it('omits meta entirely when no meta was supplied', () => {
    logger.info('bare');
    const raw = logSpy.mock.calls[0]?.[0];
    expect(typeof raw).toBe('string');
    expect(raw as string).not.toContain('"meta"');
  });

  it('collapses an explicitly empty meta object the same way', () => {
    logger.info({}, 'msg');
    const raw = logSpy.mock.calls[0]?.[0] as string;
    expect(raw).not.toContain('"meta"');
  });

  it('serializes Errors with causes end to end (JSON-round-trippable)', () => {
    const err = new Error('outer', { cause: new Error('inner') });
    logger.error({ err }, 'failed');

    const arg = errorSpy.mock.calls[0]?.[0];
    expect(typeof arg).toBe('string');

    const entry = readLine(arg);
    const serializedErr = asRecord(asRecord(entry.meta).err);
    const cause = asRecord(serializedErr.cause);
    expect(cause.message).toBe('inner');
  });

  it('uses firstEntry() to read the earliest line when several were written', () => {
    logger.info('one');
    logger.info('two');
    expect(firstEntry(logSpy).message).toBe('one');
    expect(lastEntry(logSpy).message).toBe('two');
  });
});
