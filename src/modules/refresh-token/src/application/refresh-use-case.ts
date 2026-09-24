// import { AppError } from '@template/shared';
// import type { JwtPort } from '../domain/jwt-port.js';
// import type { RefreshTokenRepositoryPort } from '../domain/refresh-token-repository-port.js';
// import type { CookiePort } from '../domain/cookie-port.js';
// import type { UsersFacade } from '../../users/index.js';
// import type { Response } from 'express';

// export interface RefreshTokenInput {
//   refreshToken: string | null;
//   res: Response;
// }

// export interface RefreshTokenOutput {
//   accessToken: string;
// }

// export class RefreshTokenUseCase {
//   constructor(
//     private readonly deps: {
//       jwtService: JwtPort;
//       refreshTokenRepository: RefreshTokenRepositoryPort;
//       cookieAdapter: CookiePort;
//       usersFacade: UsersFacade; // Interacting strictly via the Facade boundary
//     },
//   ) {}

//   async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
//     if (!input.refreshToken) {
//       throw AppError.unauthorized('Refresh token is missing');
//     }

//     const payload = this.deps.jwtService.verifyRefresh(input.refreshToken);
//     if (!payload) {
//       throw AppError.unauthorized('Invalid or expired refresh token');
//     }

//     const storedToken = await this.deps.refreshTokenRepository.revoke(input.refreshToken);
//     if (!storedToken) {
//       throw AppError.unauthorized('Refresh token has been revoked or used');
//     }

//     if (storedToken.expiresAt.getTime() < Date.now()) {
//       throw AppError.unauthorized('Refresh token expired');
//     }

//     // Safely retrieve user data from the Users module using the Facade
//     const user = await this.deps.usersFacade.getUserForToken(payload.userId);
//     if (!user) {
//       throw AppError.unauthorized('User no longer exists');
//     }

//     // Construct the rich Access Token payload
//     const newAccessToken = this.deps.jwtService.signAccess({
//       userId: user.userId,
//       email: user.email,
//       fullname: user.fullname,
//     });

//     // Construct the strict Refresh Token payload
//     const newRefreshToken = this.deps.jwtService.signRefresh({
//       userId: user.userId,
//     });

//     await this.deps.refreshTokenRepository.save({
//       userId: user.userId,
//       token: newRefreshToken,
//     });

//     this.deps.cookieAdapter.setAccessCookie(input.res, newAccessToken);
//     this.deps.cookieAdapter.setRefreshCookie(input.res, newRefreshToken);

//     return { accessToken: newAccessToken };
//   }
// }
