import type { DomainEventDispatcher, MessageBroker } from '@template/shared';
import { USER_CREATED } from '../domain/events/user-created-event.js';
import { USER_UPDATED } from '../domain/events/user-update-event.js';
import type { UserCreatedPayload, UserUpdatedPayload } from '../domain/events/events-types.js';

export class UserIntegrationEventPublisher {
  constructor(private readonly deps: { messageBroker: MessageBroker }) {}

  wire(domainEventDispatcher: DomainEventDispatcher): () => void {
    const unsubscribers = [
      domainEventDispatcher.on<UserCreatedPayload>(USER_CREATED, async (event) => {
        await this.deps.messageBroker.publish(USER_CREATED, event.payload);
      }),

      domainEventDispatcher.on<UserUpdatedPayload>(USER_UPDATED, async (event) => {
        await this.deps.messageBroker.publish(USER_UPDATED, event.payload);
      }),
    ];

    return () => {
      for (const unsub of unsubscribers) unsub();
    };
  }
}
