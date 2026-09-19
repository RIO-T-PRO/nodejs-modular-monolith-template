/**
 * Low-level transport for integration events.
 * Application code talks to MessageBroker, never to this directly.
 * Implementations: MemoryMessageDispatcher (single server), RedisMessageDispatcher (horizontal scale).
 */
export interface MessageDispatcher {
  publish(channel: string, message: string): Promise<void>;
  /**
   * Registers a handler for `channel`. Returns an unsubscribe function so
   * module teardown can stop delivery without tearing down the connection.
   */
  subscribe(channel: string, handler: (message: string) => void): Promise<() => void>;
  /** Release sockets, subscriptions, timers. Called from container disposal. */
  dispose(): Promise<void>;
}
