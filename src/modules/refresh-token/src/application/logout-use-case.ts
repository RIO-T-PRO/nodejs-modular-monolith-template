import type { RefreshTokenRepositoryPort } from '../domain/refresh-token-repository-port.js';
import type { CookiePort } from '../domain/cookie-port.js';
import type { Response } from 'express';

export interface LogoutInput {
  refreshToken: string | null;
  res: Response;
}

export class LogoutUseCase {
  constructor(
    private readonly deps: {
      refreshTokenRepository: RefreshTokenRepositoryPort;
      cookieAdapter: CookiePort;
    },
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    if (input.refreshToken) {
      // Safely attempts to delete. If it's already gone, it just returns null and proceeds.
      await this.deps.refreshTokenRepository.revoke(input.refreshToken);
    }

    this.deps.cookieAdapter.clearAuthCookies(input.res);
  }
}
