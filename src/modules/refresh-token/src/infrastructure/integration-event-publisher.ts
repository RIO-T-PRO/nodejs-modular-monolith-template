import type { DomainEventDispatcher, MessageBroker } from '@template/shared';
import { REVOKE_REFRESH_TOKEN, SAVE_REFRESH_TOKEN } from '../domain/events/refresh-token-event.js';
import type { SaveRefreshTokenPayload } from '../domain/events/events-types.js';

export class RefreshTokenIntegrationEventPublisher {
  constructor(private readonly deps: { messageBroker: MessageBroker }) {}

  wire(domainEventDispatcher: DomainEventDispatcher): () => void {
    const unsubscribers = [
      domainEventDispatcher.on<SaveRefreshTokenPayload>(SAVE_REFRESH_TOKEN, async (event) => {
        await this.deps.messageBroker.publish(SAVE_REFRESH_TOKEN, event.payload);
      }),

      domainEventDispatcher.on<string>(REVOKE_REFRESH_TOKEN, async (event) => {
        await this.deps.messageBroker.publish(REVOKE_REFRESH_TOKEN, event.payload);
      }),
    ];

    return () => {
      for (const unsub of unsubscribers) unsub();
    };
  }
}
