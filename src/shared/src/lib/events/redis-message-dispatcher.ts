import { Redis } from 'ioredis';
import type { MessageDispatcher } from './message-dispatcher-interface.js';

/**
 * @environment MULTI-SERVER PRODUCTION ONLY
 * Requires a running Redis instance for horizontal scaling.
 */
export class RedisMessageDispatcher implements MessageDispatcher {
  private publisher: Redis;
  private subscriber: Redis;

  constructor(redisUrl: string) {
    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.publisher.publish(channel, message);
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (receivedChannel: string, message: string) => {
      if (receivedChannel === channel) handler(message);
    });
  }
}
