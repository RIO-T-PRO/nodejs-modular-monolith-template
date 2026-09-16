import type { MessageDispatcher } from './message-dispatcher-interface.js';

/**
 * INTEGRATION EVENTS (Cross-Module, Asynchronous)
 *
 * @usage Use this when one module needs to broadcast to the REST of the app.
 * @rules Handled asynchronously. Data MUST be JSON-serializable.
 */
export interface IntegrationEvent<TPayload = unknown> {
  readonly name: string;
  readonly payload: TPayload;
  readonly occurredAt: string;
}

export class MessageBroker {
  constructor(private readonly dispatcher: MessageDispatcher) {}

  async publish<TPayload>(name: string, payload: TPayload): Promise<void> {
    const event: IntegrationEvent<TPayload> = {
      name,
      payload,
      occurredAt: new Date().toISOString(),
    };
    await this.dispatcher.publish(name, JSON.stringify(event));
  }

  async subscribe<TPayload>(
    name: string,
    handler: (event: IntegrationEvent<TPayload>) => void | Promise<void>,
  ): Promise<void> {
    await this.dispatcher.subscribe(name, (raw) => {
      const event = JSON.parse(raw) as IntegrationEvent<TPayload>;
      void handler(event);
    });
  }
}
