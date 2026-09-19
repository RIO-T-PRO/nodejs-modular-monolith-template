/* eslint-disable @typescript-eslint/require-await */
import { EventEmitter } from 'node:events';
import type { MessageDispatcher } from './message-dispatcher-interface.js';

/**
 * In-process transport for local dev, tests, and single-server deployments.
 * No external infrastructure required.
 */
export class MemoryMessageDispatcher implements MessageDispatcher {
  private readonly emitter = new EventEmitter();

  async publish(channel: string, message: string): Promise<void> {
    this.emitter.emit(channel, message);
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<() => void> {
    this.emitter.on(channel, handler);
    return () => {
      this.emitter.off(channel, handler);
    };
  }

  // No external resources, but we keep the shape consistent.
  async dispose(): Promise<void> {
    this.emitter.removeAllListeners();
  }
}
