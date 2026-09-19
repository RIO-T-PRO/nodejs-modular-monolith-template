import { z } from 'zod';
import type { Logger } from '../logger.js';
import type { MessageDispatcher } from './message-dispatcher-interface.js';

/**
 * INTEGRATION EVENTS (cross-module, asynchronous).
 * The wire format carries payload as JSON plus metadata so consumers on the
 * other side can validate and trace it.
 */
export interface IntegrationEvent<TPayload = unknown> {
  readonly name: string;
  readonly payload: TPayload;
  readonly occurredAt: string;
  /** Optional; propagated across module boundaries for tracing. */
  readonly correlationId?: string;
}

// Runtime contract for anything that comes off the wire. Consumers must not
// trust the shape of an inbound message, even from a sibling module.
const IntegrationEventSchema = z.object({
  name: z.string().min(1),
  payload: z.unknown(),
  occurredAt: z.string().datetime(),
  correlationId: z.string().optional(),
});

type Handler<TPayload> = (event: IntegrationEvent<TPayload>) => void | Promise<void>;

export class MessageBroker {
  constructor(
    private readonly dispatcher: MessageDispatcher,
    private readonly logger: Logger,
  ) {}

  async publish<TPayload>(
    name: string,
    payload: TPayload,
    opts: { correlationId?: string } = {},
  ): Promise<void> {
    const event: IntegrationEvent<TPayload> = {
      name,
      payload,
      occurredAt: new Date().toISOString(),
      correlationId: opts.correlationId,
    };
    await this.dispatcher.publish(name, JSON.stringify(event));
  }

  /**
   * Subscribe to an integration event. Returns an unsubscribe function so a
   * module can stop receiving events when its scope is disposed.
   */
  async subscribe<TPayload>(name: string, handler: Handler<TPayload>): Promise<() => void> {
    const wrapped = (raw: string): void => {
      let event: IntegrationEvent<TPayload>;
      try {
        const parsed = IntegrationEventSchema.parse(JSON.parse(raw));
        event = parsed as IntegrationEvent<TPayload>;
      } catch (err) {
        // Malformed messages are logged and dropped — never crash the subscriber loop.
        this.logger.error({ err, raw, channel: name }, 'malformed integration event');
        return;
      }

      // Run async and surface failures through the logger. `void` prevents
      // an unhandledRejection from killing the process.
      void Promise.resolve(handler(event)).catch((err) => {
        this.logger.error({ err, event }, 'integration event handler failed');
      });
    };

    return this.dispatcher.subscribe(name, wrapped);
  }

  /** Called from container disposal. */
  async dispose(): Promise<void> {
    await this.dispatcher.dispose();
  }
}
