/* eslint-disable @typescript-eslint/require-await */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { MessageBroker } from '../message-broker.js';
import type { Logger } from '../../logger/interfaces/logger-interface.js';
import type { MessageDispatcher } from '../interfaces/message-dispatcher-interface.js';
import type { IntegrationEvent } from '../interfaces/integration-event-interface.js';

/* ------------------------------- Helpers -------------------------------- */

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

interface DispatcherHarness {
  dispatcher: MessageDispatcher;
  published: Array<{ channel: string; message: string }>;
  /** Invoke the last handler registered via `subscribe`. */
  deliver: (raw: string) => void;
  /** All handlers registered via `subscribe`, in order. */
  handlers: Array<(message: string) => void>;
  subscribeSpy: Mock;
  publishSpy: Mock;
  disposeSpy: Mock;
}

const makeDispatcher = (): DispatcherHarness => {
  const published: Array<{ channel: string; message: string }> = [];
  const handlers: Array<(message: string) => void> = [];

  const publishSpy = vi.fn(async (channel: string, message: string) => {
    published.push({ channel, message });
  });
  const subscribeSpy = vi.fn(async (_channel: string, handler: (m: string) => void) => {
    handlers.push(handler);
    return () => {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    };
  });
  const disposeSpy = vi.fn(async () => {});

  const dispatcher: MessageDispatcher = {
    publish: publishSpy,
    subscribe: subscribeSpy,
    dispose: disposeSpy,
  };

  return {
    dispatcher,
    published,
    handlers,
    subscribeSpy,
    publishSpy,
    disposeSpy,
    deliver: (raw: string) => {
      const last = handlers[handlers.length - 1];
      if (!last) throw new Error('No handler registered');
      last(raw);
    },
  };
};

const flushAsync = () => new Promise<void>((r) => setImmediate(r));

beforeEach(() => {
  vi.clearAllMocks();
});

/* ------------------------------- publish -------------------------------- */

describe('MessageBroker#publish', () => {
  it('wraps the payload in an IntegrationEvent and publishes JSON', async () => {
    const h = makeDispatcher();
    const broker = new MessageBroker(h.dispatcher, makeLogger());

    await broker.publish('user.created', { id: 1, email: 'a@b.c' });

    expect(h.publishSpy).toHaveBeenCalledTimes(1);
    expect(h.published).toHaveLength(1);
    expect(h.published[0]!.channel).toBe('user.created');

    const parsed = JSON.parse(h.published[0]!.message) as IntegrationEvent<{ id: number }>;
    expect(parsed).toMatchObject({
      name: 'user.created',
      payload: { id: 1, email: 'a@b.c' },
    });
    expect(typeof parsed.occurredAt).toBe('string');
    expect(new Date(parsed.occurredAt).toISOString()).toBe(parsed.occurredAt);
  });

  it('omits correlationId when not provided', async () => {
    const h = makeDispatcher();
    const broker = new MessageBroker(h.dispatcher, makeLogger());

    await broker.publish('evt', { x: 1 });

    const parsed = JSON.parse(h.published[0]!.message) as IntegrationEvent;
    // JSON.stringify drops undefined keys → no "correlationId" in the wire form
    expect('correlationId' in parsed).toBe(false);
  });

  it('includes correlationId when provided', async () => {
    const h = makeDispatcher();
    const broker = new MessageBroker(h.dispatcher, makeLogger());

    await broker.publish('evt', { x: 1 }, { correlationId: 'corr-42' });

    const parsed = JSON.parse(h.published[0]!.message) as IntegrationEvent;
    expect(parsed.correlationId).toBe('corr-42');
  });

  it('propagates dispatcher failures', async () => {
    const h = makeDispatcher();
    h.publishSpy.mockRejectedValueOnce(new Error('transport down'));
    const broker = new MessageBroker(h.dispatcher, makeLogger());

    await expect(broker.publish('evt', {})).rejects.toThrow('transport down');
  });
});

/* ------------------------------ subscribe ------------------------------- */

describe('MessageBroker#subscribe', () => {
  it('parses a valid event and invokes the handler', async () => {
    const h = makeDispatcher();
    const broker = new MessageBroker(h.dispatcher, makeLogger());
    const handler = vi.fn();

    await broker.subscribe('user.created', handler);

    h.deliver(
      JSON.stringify({
        name: 'user.created',
        payload: { id: 7 },
        occurredAt: new Date().toISOString(),
      }),
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0]).toMatchObject({
      name: 'user.created',
      payload: { id: 7 },
    });
  });

  it('forwards the correlationId when present', async () => {
    const h = makeDispatcher();
    const broker = new MessageBroker(h.dispatcher, makeLogger());
    const handler = vi.fn();

    await broker.subscribe('evt', handler);
    h.deliver(
      JSON.stringify({
        name: 'evt',
        payload: {},
        occurredAt: new Date().toISOString(),
        correlationId: 'corr-1',
      }),
    );

    expect(handler.mock.calls[0]![0]).toMatchObject({ correlationId: 'corr-1' });
  });

  it('strips unknown keys (zod default behavior)', async () => {
    const h = makeDispatcher();
    const broker = new MessageBroker(h.dispatcher, makeLogger());
    const handler = vi.fn();

    await broker.subscribe('evt', handler);
    h.deliver(
      JSON.stringify({
        name: 'evt',
        payload: {},
        occurredAt: new Date().toISOString(),
        extra: 'should be stripped',
      }),
    );

    const event = handler.mock.calls[0]![0] as Record<string, unknown>;
    expect('extra' in event).toBe(false);
  });

  it('logs and drops malformed JSON', async () => {
    const h = makeDispatcher();
    const logger = makeLogger();
    const broker = new MessageBroker(h.dispatcher, logger);
    const handler = vi.fn();

    await broker.subscribe('evt', handler);
    h.deliver('not json');

    expect(handler).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'evt', raw: 'not json' }),
      'malformed integration event',
    );
  });

  it('logs and drops when the schema rejects the shape', async () => {
    const h = makeDispatcher();
    const logger = makeLogger();
    const broker = new MessageBroker(h.dispatcher, logger);
    const handler = vi.fn();

    await broker.subscribe('evt', handler);
    // missing `name`
    h.deliver(JSON.stringify({ payload: {}, occurredAt: new Date().toISOString() }));

    expect(handler).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'evt' }),
      'malformed integration event',
    );
  });

  it('rejects an empty name (schema min(1))', async () => {
    const h = makeDispatcher();
    const broker = new MessageBroker(h.dispatcher, makeLogger());
    const handler = vi.fn();

    await broker.subscribe('evt', handler);
    h.deliver(JSON.stringify({ name: '', payload: {}, occurredAt: new Date().toISOString() }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects a non-ISO occurredAt', async () => {
    const h = makeDispatcher();
    const broker = new MessageBroker(h.dispatcher, makeLogger());
    const handler = vi.fn();

    await broker.subscribe('evt', handler);
    h.deliver(JSON.stringify({ name: 'evt', payload: {}, occurredAt: 'yesterday' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('logs async handler rejections without crashing', async () => {
    const h = makeDispatcher();
    const logger = makeLogger();
    const broker = new MessageBroker(h.dispatcher, logger);
    const handler = vi.fn(async () => {
      throw new Error('handler boom');
    });

    await broker.subscribe('evt', handler);
    h.deliver(JSON.stringify({ name: 'evt', payload: {}, occurredAt: new Date().toISOString() }));
    await flushAsync();

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'integration event handler failed',
    );
  });

  // Documents a known limitation: `Promise.resolve(handler(event)).catch(...)`
  // catches async rejections but NOT synchronous throws — the sync throw
  // escapes before Promise.resolve is reached. See note at bottom of the file.
  it('propagates a synchronous throw from the handler (known limitation)', async () => {
    const h = makeDispatcher();
    const broker = new MessageBroker(h.dispatcher, makeLogger());
    const handler = vi.fn(() => {
      throw new Error('sync boom');
    });

    await broker.subscribe('evt', handler);

    expect(() =>
      h.deliver(JSON.stringify({ name: 'evt', payload: {}, occurredAt: new Date().toISOString() })),
    ).toThrow('sync boom');
  });

  it('returns whatever the dispatcher subscribe returns', async () => {
    const h = makeDispatcher();
    const broker = new MessageBroker(h.dispatcher, makeLogger());

    const unsub = await broker.subscribe('evt', vi.fn());
    expect(typeof unsub).toBe('function');

    // Verify the unsubscribe actually removes the wrapped handler.
    unsub();
    expect(h.handlers).toHaveLength(0);
  });
});

/* ------------------------------- dispose -------------------------------- */

describe('MessageBroker#dispose', () => {
  it('delegates to the dispatcher', async () => {
    const h = makeDispatcher();
    const broker = new MessageBroker(h.dispatcher, makeLogger());

    await broker.dispose();

    expect(h.disposeSpy).toHaveBeenCalledTimes(1);
  });
});
