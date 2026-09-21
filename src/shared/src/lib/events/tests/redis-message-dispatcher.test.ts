import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Logger } from '../../logger/interfaces/logger-interface.js';

/* ------------------------------- Mocks ---------------------------------- */

const mocks = vi.hoisted(() => ({
  instances: [] as unknown[],
}));

vi.mock('ioredis', () => {
  class Redis {
    on = vi.fn();
    publish = vi.fn().mockResolvedValue(1);
    subscribe = vi.fn().mockResolvedValue(undefined);
    unsubscribe = vi.fn().mockResolvedValue(undefined);
    quit = vi.fn().mockResolvedValue('OK');
    constructor() {
      mocks.instances.push(this);
    }
  }
  return { Redis };
});

/* ------------------------------- Imports -------------------------------- */

import { RedisMessageDispatcher } from '../redis-message-dispatcher.js';

/* ------------------------------- Helpers -------------------------------- */

interface MockRedis {
  on: ReturnType<typeof vi.fn>;
  publish: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  quit: ReturnType<typeof vi.fn>;
}

const makeLogger = (): Logger => {
  const logger: Logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => logger),
  };
  return logger;
};

interface Harness {
  dispatcher: RedisMessageDispatcher;
  pub: MockRedis;
  sub: MockRedis;
  logger: Logger;
  /** Invoke the 'message' listener the dispatcher attached to the subscriber. */
  emit: (channel: string, message: string) => void;
}

/**
 * Build a fresh dispatcher with a fresh logger (or a caller-supplied one).
 * Asserts exactly 2 Redis instances were constructed, so a broken mock or a
 * changed constructor fails loudly here rather than as an obscure
 * "Cannot read properties of undefined" further down the test.
 */
const makeHarness = (logger: Logger = makeLogger()): Harness => {
  mocks.instances.length = 0;
  const dispatcher = new RedisMessageDispatcher('redis://x', logger);

  if (mocks.instances.length !== 2) {
    throw new Error(
      `Expected RedisMessageDispatcher to construct exactly 2 Redis clients, ` +
        `got ${mocks.instances.length}. Is the ioredis mock applied?`,
    );
  }

  const pub = mocks.instances[0] as MockRedis;
  const sub = mocks.instances[1] as MockRedis;

  return {
    dispatcher,
    pub,
    sub,
    logger,
    emit: (channel, message) => {
      const call = sub.on.mock.calls.find((c) => c[0] === 'message');
      if (!call) throw new Error('No "message" listener attached to subscriber');
      const listener = call[1] as (c: string, m: string) => void;
      listener(channel, message);
    },
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.instances.length = 0;
});

/* ----------------------------- constructor ------------------------------ */

describe('RedisMessageDispatcher — constructor', () => {
  it('creates a publisher and a subscriber', () => {
    const h = makeHarness();
    expect(h.pub).toBeDefined();
    expect(h.sub).toBeDefined();
    expect(h.pub).not.toBe(h.sub);
  });

  it('attaches an error handler on both connections', () => {
    const h = makeHarness();
    expect(h.pub.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(h.sub.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('logs publisher errors', () => {
    const logger = makeLogger();
    const h = makeHarness(logger);
    const handler = h.pub.on.mock.calls.find((c) => c[0] === 'error')?.[1] as (e: Error) => void;

    const err = new Error('conn lost');
    handler(err);
    expect(logger.error).toHaveBeenCalledWith({ err }, 'redis publisher error');
  });

  it('logs subscriber errors', () => {
    const logger = makeLogger();
    const h = makeHarness(logger);
    const handler = h.sub.on.mock.calls.find((c) => c[0] === 'error')?.[1] as (e: Error) => void;

    const err = new Error('conn lost');
    handler(err);
    expect(logger.error).toHaveBeenCalledWith({ err }, 'redis subscriber error');
  });
});

/* ------------------------------- publish -------------------------------- */

describe('RedisMessageDispatcher#publish', () => {
  it('delegates to publisher.publish', async () => {
    const h = makeHarness();
    await h.dispatcher.publish('ch', 'msg');
    expect(h.pub.publish).toHaveBeenCalledWith('ch', 'msg');
  });

  it('is a no-op after dispose', async () => {
    const h = makeHarness();
    await h.dispatcher.dispose();
    h.pub.publish.mockClear();

    await h.dispatcher.publish('ch', 'msg');
    expect(h.pub.publish).not.toHaveBeenCalled();
  });
});

/* ------------------------------ subscribe ------------------------------- */

describe('RedisMessageDispatcher#subscribe', () => {
  it('issues SUBSCRIBE on the first handler for a channel', async () => {
    const h = makeHarness();
    await h.dispatcher.subscribe('ch', vi.fn());
    expect(h.sub.subscribe).toHaveBeenCalledWith('ch');
    expect(h.sub.subscribe).toHaveBeenCalledTimes(1);
  });

  it('does NOT re-SUBSCRIBE for a second handler on the same channel', async () => {
    const h = makeHarness();
    await h.dispatcher.subscribe('ch', vi.fn());
    await h.dispatcher.subscribe('ch', vi.fn());
    expect(h.sub.subscribe).toHaveBeenCalledTimes(1);
  });

  it('delivers messages to all handlers on the channel', async () => {
    const h = makeHarness();
    const a = vi.fn();
    const b = vi.fn();
    await h.dispatcher.subscribe('ch', a);
    await h.dispatcher.subscribe('ch', b);

    h.emit('ch', 'payload');
    expect(a).toHaveBeenCalledWith('payload');
    expect(b).toHaveBeenCalledWith('payload');
  });

  it('ignores messages for unknown channels', () => {
    const h = makeHarness();
    // No subscribers registered — the fan-out listener must not throw.
    expect(() => h.emit('unknown', 'x')).not.toThrow();
  });

  it('isolates handlers per channel', async () => {
    const h = makeHarness();
    const a = vi.fn();
    const b = vi.fn();
    await h.dispatcher.subscribe('a', a);
    await h.dispatcher.subscribe('b', b);

    h.emit('a', 'msg-a');
    expect(a).toHaveBeenCalledWith('msg-a');
    expect(b).not.toHaveBeenCalled();
  });

  it('returns an unsubscribe that removes just that handler', async () => {
    const h = makeHarness();
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = await h.dispatcher.subscribe('ch', a);
    await h.dispatcher.subscribe('ch', b);

    unsubA();
    h.emit('ch', 'x');
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledWith('x');
  });

  it('unsubscribes at the Redis level when the last handler leaves', async () => {
    const h = makeHarness();
    const unsub = await h.dispatcher.subscribe('ch', vi.fn());
    unsub();
    // unsubscribe is fire-and-forget (void ... .catch); flush microtasks.
    await Promise.resolve();
    expect(h.sub.unsubscribe).toHaveBeenCalledWith('ch');
  });

  it('does NOT unsubscribe at the Redis level when other handlers remain', async () => {
    const h = makeHarness();
    const unsubA = await h.dispatcher.subscribe('ch', vi.fn());
    await h.dispatcher.subscribe('ch', vi.fn());

    unsubA();
    await Promise.resolve();
    expect(h.sub.unsubscribe).not.toHaveBeenCalled();
  });

  it('logs when a handler throws synchronously (and others still run)', async () => {
    const logger = makeLogger();
    const h = makeHarness(logger);
    const ok = vi.fn();
    await h.dispatcher.subscribe('ch', () => {
      throw new Error('handler boom');
    });
    await h.dispatcher.subscribe('ch', ok);

    h.emit('ch', 'x');
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'ch' }),
      'redis handler threw',
    );
    expect(ok).toHaveBeenCalledWith('x');
  });

  it('returns a no-op unsubscribe when already disposed', async () => {
    const h = makeHarness();
    await h.dispatcher.dispose();
    h.sub.subscribe.mockClear();

    const unsub = await h.dispatcher.subscribe('ch', vi.fn());
    expect(typeof unsub).toBe('function');
    expect(h.sub.subscribe).not.toHaveBeenCalled();
  });
});

/* ------------------------------- dispose -------------------------------- */

describe('RedisMessageDispatcher#dispose', () => {
  it('quits both connections', async () => {
    const h = makeHarness();
    await h.dispatcher.dispose();
    expect(h.pub.quit).toHaveBeenCalledTimes(1);
    expect(h.sub.quit).toHaveBeenCalledTimes(1);
  });

  it('is idempotent', async () => {
    const h = makeHarness();
    await h.dispatcher.dispose();
    await h.dispatcher.dispose();
    expect(h.pub.quit).toHaveBeenCalledTimes(1);
    expect(h.sub.quit).toHaveBeenCalledTimes(1);
  });

  it('survives a failing quit on one connection', async () => {
    const h = makeHarness();
    h.pub.quit.mockRejectedValueOnce(new Error('already closed'));

    await expect(h.dispatcher.dispose()).resolves.toBeUndefined();
    expect(h.sub.quit).toHaveBeenCalledTimes(1);
  });

  it('clears the handler map (messages after dispose are dropped)', async () => {
    const h = makeHarness();
    const handler = vi.fn();
    await h.dispatcher.subscribe('ch', handler);
    await h.dispatcher.dispose();

    h.emit('ch', 'late');
    expect(handler).not.toHaveBeenCalled();
  });
});
