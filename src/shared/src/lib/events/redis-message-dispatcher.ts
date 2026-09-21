import { Redis } from 'ioredis';
import type { Logger } from '../logger/interfaces/logger-interface.js';
import type { MessageDispatcher } from './interfaces/message-dispatcher-interface.js';

/**
 * Redis pub/sub transport. Choose this ONLY when the app runs as more than
 * one process that must share events; otherwise MemoryMessageDispatcher is
 * correct. Pub/sub is fire-and-forget — no persistence, no ordering, no
 * redelivery. One subscriber connection, many handlers per channel.
 */
export class RedisMessageDispatcher implements MessageDispatcher {
  private readonly publisher: Redis;
  private readonly subscriber: Redis;
  private readonly handlers = new Map<string, Set<(message: string) => void>>();
  private disposed = false;

  constructor(
    redisUrl: string,
    private readonly logger: Logger,
  ) {
    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);

    // ioredis emits `error` on the client; without a listener Node will crash.
    this.publisher.on('error', (err) => this.logger.error({ err }, 'redis publisher error'));
    this.subscriber.on('error', (err) => this.logger.error({ err }, 'redis subscriber error'));

    // Single fan-out listener; per-channel handlers live in the Map.
    this.subscriber.on('message', (channel, message) => {
      const set = this.handlers.get(channel);
      if (!set) return;
      for (const handler of set) {
        // One bad handler must not prevent others from running.
        try {
          handler(message);
        } catch (err) {
          this.logger.error({ err, channel }, 'redis handler threw');
        }
      }
    });
  }

  async publish(channel: string, message: string): Promise<void> {
    if (this.disposed) return;
    await this.publisher.publish(channel, message);
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<() => void> {
    if (this.disposed) return () => {};

    let set = this.handlers.get(channel);
    if (!set) {
      set = new Set();
      this.handlers.set(channel, set);
      // Only issue SUBSCRIBE the first time we see this channel.
      await this.subscriber.subscribe(channel);
    }
    set.add(handler);

    return () => {
      const current = this.handlers.get(channel);
      if (!current) return;
      current.delete(handler);
      // Last handler for the channel → drop the Redis subscription too.
      if (current.size === 0) {
        this.handlers.delete(channel);
        void this.subscriber.unsubscribe(channel).catch((err) => {
          this.logger.error({ err, channel }, 'redis unsubscribe failed');
        });
      }
    };
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.handlers.clear();
    // allSettled so a slow/failed quit on one connection doesn't block the other.
    await Promise.allSettled([this.publisher.quit(), this.subscriber.quit()]);
  }
}
