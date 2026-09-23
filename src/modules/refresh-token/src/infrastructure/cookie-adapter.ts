import type { Response } from 'express';
import type { CookiePort } from '../domain/cookie-port.js';
import { env } from '@template/shared';

const IS_PROD = env.NODE_ENV === 'production';

const BASE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: 'strict' as const,
};

export class CookieAdapter implements CookiePort {
  setAccessCookie(res: Response, token: string): void {
    res.cookie('access_token', token, {
      ...BASE_OPTIONS,
      maxAge: env.JWT_ACCESS_SECRET_KEY_EXPIRES_IN * 1000,
    });
  }

  setRefreshCookie(res: Response, token: string): void {
    res.cookie('refresh_token', token, {
      ...BASE_OPTIONS,
      maxAge: env.JWT_REFRESH__SECRET_KEY_EXPIRES_IN * 1000,
    });
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', BASE_OPTIONS);
    res.clearCookie('refresh_token', BASE_OPTIONS);
  }
}
