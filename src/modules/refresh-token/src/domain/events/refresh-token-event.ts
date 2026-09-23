import type { DomainEvent } from '@template/shared';
import type { SaveRefreshTokenPayload } from './events-types.js';

export const SAVE_REFRESH_TOKEN = 'token.save' as const;
export const REVOKE_REFRESH_TOKEN = 'token.revoke' as const;

export const SaveRefreshTokenEvent = (
  payload: SaveRefreshTokenPayload,
): DomainEvent<SaveRefreshTokenPayload> => {
  return { name: SAVE_REFRESH_TOKEN, payload, occurredAt: new Date() };
};

export const RevokeRefreshToken = (payload: string): DomainEvent<string> => {
  return { name: REVOKE_REFRESH_TOKEN, payload, occurredAt: new Date() };
};
