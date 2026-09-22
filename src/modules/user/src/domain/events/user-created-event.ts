import type { DomainEvent } from '@template/shared';
import type { UserCreatedPayload } from './events-types.js';

export const USER_CREATED = 'user.created' as const;

export const UserCreatedEvent = (payload: UserCreatedPayload): DomainEvent<UserCreatedPayload> => {
  return { name: USER_CREATED, payload, occurredAt: new Date() };
};
