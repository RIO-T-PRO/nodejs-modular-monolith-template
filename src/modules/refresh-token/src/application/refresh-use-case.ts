import { AppError } from '@template/shared';
import type { Response } from 'express';
import type { JwtPort } from '../domain/jwt-port.js';
import type { RefreshTokenRepositoryPort } from '../domain/refresh-token-repository-port.js';
import type { CookiePort } from '../domain/cookie-port.js';
import type { UserLookupPort } from '../domain/user-lookup-port.js';

export interface RefreshTokenInput {
  refreshToken: string | null;
  res: Response;
}

export interface RefreshTokenOutput {
  accessToken: string;
}

export class RefreshTokenUseCase {
  constructor(
    private readonly deps: {
      jwtService: JwtPort;
      refreshTokenRepository: RefreshTokenRepositoryPort;
      cookieAdapter: CookiePort;
      userLookup: UserLookupPort;
    },
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    if (!input.refreshToken) {
      throw AppError.unauthorized('Refresh token is missing');
    }

    const payload = this.deps.jwtService.verifyRefresh(input.refreshToken);
    if (!payload) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    // Consumes (deletes) the token and returns it. Rotation: each token is single-use.
    const storedToken = await this.deps.refreshTokenRepository.revoke(input.refreshToken);
    if (!storedToken) {
      throw AppError.unauthorized('Refresh token has been revoked or used');
    }
    if (storedToken.expiresAt.getTime() < Date.now()) {
      throw AppError.unauthorized('Refresh token expired');
    }

    const user = await this.deps.userLookup.findById(payload.userId);
    if (!user) {
      throw AppError.unauthorized('User no longer exists');
    }

    const accessToken = this.deps.jwtService.signAccess({
      userId: user.user_id,
      email: user.email,
      fullname: user.fullName,
    });
    const refreshToken = this.deps.jwtService.signRefresh({ userId: user.user_id });

    await this.deps.refreshTokenRepository.save({ userId: user.user_id, token: refreshToken });

    this.deps.cookieAdapter.setAccessCookie(input.res, accessToken);
    this.deps.cookieAdapter.setRefreshCookie(input.res, refreshToken);

    return { accessToken };
  }
}
