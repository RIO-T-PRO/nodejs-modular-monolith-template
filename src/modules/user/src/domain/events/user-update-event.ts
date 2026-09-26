import type { DomainEvent } from '@template/shared';
import type { UserUpdatedPayload } from './events-types.js';

export const USER_UPDATED = 'user.update' as const;

export const UserCreatedEvent = (payload: UserUpdatedPayload): DomainEvent<UserUpdatedPayload> => {
  return { name: USER_UPDATED, payload, occurredAt: new Date() };
};
