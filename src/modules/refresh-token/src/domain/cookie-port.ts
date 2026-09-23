import type { Response } from 'express';

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge?: number;
}

export interface CookiePort {
  setAccessCookie(res: Response, token: string): void;
  setRefreshCookie(res: Response, token: string): void;
  clearAuthCookies(res: Response): void;
}
