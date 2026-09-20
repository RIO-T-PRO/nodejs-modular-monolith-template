import { EventEmitter } from 'node:events';
import type { MessageDispatcher } from './interfaces/message-dispatcher-interface.js';

/**
 * In-memory transport. This is the DEFAULT for a single-process deployment —
 * local dev, tests, one container, one VM, `replicas: 1`. No external infra,
 * no failure modes beyond process crash. Events do not survive restart and
 * do not cross process boundaries. Switch to RedisMessageDispatcher only when
 * more than one process must share events.
 */
export class MemoryMessageDispatcher implements MessageDispatcher {
  private readonly emitter = new EventEmitter();

  publish(channel: string, message: string): Promise<void> {
    this.emitter.emit(channel, message);
    return Promise.resolve();
  }

  subscribe(channel: string, handler: (message: string) => void): Promise<() => void> {
    this.emitter.on(channel, handler);
    return Promise.resolve(() => {
      this.emitter.off(channel, handler);
    });
  }

  dispose(): Promise<void> {
    this.emitter.removeAllListeners();
    return Promise.resolve();
  }
}
