import type { Response } from 'express';
import { getRefreshModuleCradle } from './module.js';

export interface TokenUserDetails {
  userId: string;
  email: string;
  fullname: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshFacade {
  generateAndSaveTokens(user: TokenUserDetails): Promise<AuthTokens>;
  attachCookies(res: Response, tokens: AuthTokens): void;
}

export const getRefreshFacade = (): RefreshFacade => {
  // Extract ONLY Use Cases. No infrastructure adapters!
  const { generateTokensUseCase, setAuthCookiesUseCase } = getRefreshModuleCradle();

  return {
    generateAndSaveTokens: (user: TokenUserDetails) => {
      return generateTokensUseCase.execute(user);
    },

    attachCookies: (res: Response, tokens: AuthTokens) => {
      // Delegate cleanly to the use case
      setAuthCookiesUseCase.execute({
        res,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    },
  };
};
