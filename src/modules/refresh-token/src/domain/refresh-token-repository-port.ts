import type { RefreshToken, SaveRefreshTokenInput } from './refresh-token-types.js';

export interface RefreshTokenRepositoryPort {
  save(input: SaveRefreshTokenInput): Promise<RefreshToken>;
  revoke(token: string): Promise<RefreshToken | null>;
  findById(id: string): Promise<RefreshToken | null>;
  findByUserId(userId: string): Promise<RefreshToken | null>;
}
