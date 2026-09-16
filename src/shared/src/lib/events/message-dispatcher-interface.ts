/**
 * Low-level transport interface for Integration Events.
 * The rest of the app talks to the MessageBroker, never this directly.
 */
export interface MessageDispatcher {
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, handler: (message: string) => void): Promise<void>;
}
