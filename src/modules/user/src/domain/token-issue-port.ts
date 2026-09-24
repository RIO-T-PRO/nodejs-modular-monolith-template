import type { Response } from 'express';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
export interface TokenIssuerPort {
  generateAndSaveTokens(input: {
    userId: string;
    email: string;
    fullname: string;
  }): Promise<AuthTokens>;
  attachCookies(res: Response, tokens: AuthTokens): void;
}
