import { describe, it, expect, vi } from 'vitest';
import { MemoryMessageDispatcher } from '../memory-message-dispatcher.js';

describe('MemoryMessageDispatcher', () => {
  it('delivers a published message to a subscriber', async () => {
    const d = new MemoryMessageDispatcher();
    const handler = vi.fn();
    await d.subscribe('ch', handler);

    await d.publish('ch', 'hello');
    expect(handler).toHaveBeenCalledWith('hello');
  });

  it('delivers to every subscriber on the channel', async () => {
    const d = new MemoryMessageDispatcher();
    const a = vi.fn();
    const b = vi.fn();
    await d.subscribe('ch', a);
    await d.subscribe('ch', b);

    await d.publish('ch', 'x');
    expect(a).toHaveBeenCalledWith('x');
    expect(b).toHaveBeenCalledWith('x');
  });

  it('isolates subscribers by channel', async () => {
    const d = new MemoryMessageDispatcher();
    const a = vi.fn();
    const b = vi.fn();
    await d.subscribe('a', a);
    await d.subscribe('b', b);

    await d.publish('a', 'msg-a');
    expect(a).toHaveBeenCalledWith('msg-a');
    expect(b).not.toHaveBeenCalled();

    await d.publish('b', 'msg-b');
    expect(b).toHaveBeenCalledWith('msg-b');
  });

  it('stops delivery after unsubscribe', async () => {
    const d = new MemoryMessageDispatcher();
    const handler = vi.fn();
    const unsub = await d.subscribe('ch', handler);

    unsub();
    await d.publish('ch', 'gone');
    expect(handler).not.toHaveBeenCalled();
  });

  it('only unsubscribes the specific handler', async () => {
    const d = new MemoryMessageDispatcher();
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = await d.subscribe('ch', a);
    await d.subscribe('ch', b);

    unsubA();
    await d.publish('ch', 'x');
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledWith('x');
  });

  it('unsubscribing twice is safe', async () => {
    const d = new MemoryMessageDispatcher();
    const handler = vi.fn();
    const unsub = await d.subscribe('ch', handler);
    unsub();
    unsub();
    await d.publish('ch', 'x');
    expect(handler).not.toHaveBeenCalled();
  });

  it('publish resolves even with no subscribers', async () => {
    const d = new MemoryMessageDispatcher();
    await expect(d.publish('nobody', 'x')).resolves.toBeUndefined();
  });

  it('dispose removes all subscribers across all channels', async () => {
    const d = new MemoryMessageDispatcher();
    const a = vi.fn();
    const b = vi.fn();
    await d.subscribe('a', a);
    await d.subscribe('b', b);

    await d.dispose();

    await d.publish('a', 'x');
    await d.publish('b', 'y');
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('propagates a listener throw synchronously (EventEmitter semantics)', async () => {
    const d = new MemoryMessageDispatcher();
    await d.subscribe('ch', () => {
      throw new Error('listener boom');
    });

    // EventEmitter.emit propagates sync listener throws — publish throws
    // before returning its Promise. If you later wrap emit in try/catch,
    // switch this to `.rejects.toThrow(...)`.
    expect(() => d.publish('ch', 'x')).toThrow('listener boom');
  });
});
