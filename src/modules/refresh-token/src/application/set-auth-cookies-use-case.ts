import type { CookiePort } from '../domain/cookie-port.js';
import type { Response } from 'express';

export interface SetAuthCookiesInput {
  res: Response;
  accessToken: string;
  refreshToken: string;
}

export class SetAuthCookiesUseCase {
  constructor(
    private readonly deps: {
      cookieAdapter: CookiePort;
    },
  ) {}

  execute(input: SetAuthCookiesInput): void {
    this.deps.cookieAdapter.setAccessCookie(input.res, input.accessToken);
    this.deps.cookieAdapter.setRefreshCookie(input.res, input.refreshToken);
  }
}
