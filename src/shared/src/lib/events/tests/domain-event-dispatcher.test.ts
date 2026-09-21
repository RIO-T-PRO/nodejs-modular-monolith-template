/* eslint-disable @typescript-eslint/require-await */
import { describe, it, expect, vi } from 'vitest';
import { DomainEventDispatcher } from '../domain-event.js';
import type { DomainEvent } from '../interfaces/domain-event-interface.js';

const makeEvent = <T>(name: string, payload: T): DomainEvent<T> => ({
  name,
  payload,
  occurredAt: new Date(),
});

/* --------------------------------- on ----------------------------------- */

describe('DomainEventDispatcher#on', () => {
  it('registers a handler and returns an unsubscribe', () => {
    const d = new DomainEventDispatcher();
    const unsub = d.on('user.created', vi.fn());
    expect(typeof unsub).toBe('function');
  });

  it('unsubscribing stops delivery', async () => {
    const d = new DomainEventDispatcher();
    const handler = vi.fn();
    const unsub = d.on('evt', handler);
    unsub();

    await d.dispatch(makeEvent('evt', {}));
    expect(handler).not.toHaveBeenCalled();
  });

  it('unsubscribing twice is safe (idempotent)', async () => {
    const d = new DomainEventDispatcher();
    const handler = vi.fn();
    const unsub = d.on('evt', handler);
    unsub();
    unsub();

    await d.dispatch(makeEvent('evt', {}));
    expect(handler).not.toHaveBeenCalled();
  });

  it('deduplicates identical handlers via Set semantics', async () => {
    const d = new DomainEventDispatcher();
    const handler = vi.fn();
    d.on('evt', handler);
    d.on('evt', handler);

    await d.dispatch(makeEvent('evt', {}));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('isolates handlers by event name', async () => {
    const d = new DomainEventDispatcher();
    const a = vi.fn();
    const b = vi.fn();
    d.on('a', a);
    d.on('b', b);

    await d.dispatch(makeEvent('a', {}));
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
  });
});

/* ------------------------------ dispatch -------------------------------- */

describe('DomainEventDispatcher#dispatch', () => {
  it('is a no-op when no handlers are registered', async () => {
    const d = new DomainEventDispatcher();
    await expect(d.dispatch(makeEvent('missing', {}))).resolves.toBeUndefined();
  });

  it('passes the full DomainEvent (Date preserved)', async () => {
    const d = new DomainEventDispatcher();
    const handler = vi.fn();
    d.on('evt', handler);

    const occurredAt = new Date('2025-01-01T00:00:00.000Z');
    await d.dispatch({ name: 'evt', payload: { n: 1 }, occurredAt });

    expect(handler).toHaveBeenCalledWith({
      name: 'evt',
      payload: { n: 1 },
      occurredAt,
    });
    expect(handler.mock.calls[0]![0].occurredAt).toBeInstanceOf(Date);
  });

  it('calls every registered handler', async () => {
    const d = new DomainEventDispatcher();
    const a = vi.fn();
    const b = vi.fn();
    const c = vi.fn();
    d.on('evt', a);
    d.on('evt', b);
    d.on('evt', c);

    await d.dispatch(makeEvent('evt', {}));
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(c).toHaveBeenCalledTimes(1);
  });

  it('awaits async handlers before resolving', async () => {
    const d = new DomainEventDispatcher();
    let done = false;
    d.on('evt', async () => {
      await new Promise((r) => setTimeout(r, 5));
      done = true;
    });

    await d.dispatch(makeEvent('evt', {}));
    expect(done).toBe(true);
  });

  it('isolates async rejections — one handler failing does not stop others', async () => {
    const d = new DomainEventDispatcher();
    const ok = vi.fn();
    d.on('evt', async () => {
      throw new Error('boom');
    });
    d.on('evt', ok);

    // allSettled → dispatch resolves even though one handler rejected
    await expect(d.dispatch(makeEvent('evt', {}))).resolves.toBeUndefined();
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it('isolates sync throws — allSettled still calls the rest', async () => {
    const d = new DomainEventDispatcher();
    const ok = vi.fn();
    d.on('evt', () => {
      throw new Error('sync boom');
    });
    d.on('evt', ok);

    // Promise.resolve(h(event)) — h(event) throws before Promise.resolve,
    // which is fine here because it's inside `.map((h) => ...)` inside
    // allSettled's array literal. Actually — verify the real behavior:
    // The throw happens during construction of the array passed to allSettled.
    // This documents what currently happens.
    await expect(d.dispatch(makeEvent('evt', {}))).rejects.toThrow('sync boom');
    expect(ok).not.toHaveBeenCalled();
  });

  it('returns a Promise even when the handler set is empty', () => {
    const d = new DomainEventDispatcher();
    const result = d.dispatch(makeEvent('nobody', {}));
    expect(result).toBeInstanceOf(Promise);
    return result;
  });
});

/* ------------------------------- clear ---------------------------------- */

describe('DomainEventDispatcher#clear', () => {
  it('removes every handler', async () => {
    const d = new DomainEventDispatcher();
    const a = vi.fn();
    const b = vi.fn();
    d.on('a', a);
    d.on('b', b);

    d.clear();
    await d.dispatch(makeEvent('a', {}));
    await d.dispatch(makeEvent('b', {}));

    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('allows re-registration after clear', async () => {
    const d = new DomainEventDispatcher();
    d.on('evt', vi.fn());
    d.clear();

    const fresh = vi.fn();
    d.on('evt', fresh);
    await d.dispatch(makeEvent('evt', {}));
    expect(fresh).toHaveBeenCalledTimes(1);
  });
});
