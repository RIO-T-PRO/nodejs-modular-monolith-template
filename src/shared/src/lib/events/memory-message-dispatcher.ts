import { EventEmitter } from 'node:events';
import type { MessageDispatcher } from './message-dispatcher-interface.js';

/**
 * @environment LOCAL, TESTING, or SINGLE-SERVER PRODUCTION
 * Zero infrastructure dependencies. NO Redis required.
 */
export class MemoryMessageDispatcher implements MessageDispatcher {
  private emitter = new EventEmitter();

  async publish(channel: string, message: string): Promise<void> {
    this.emitter.emit(channel, message);
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    this.emitter.on(channel, handler);
  }
}
