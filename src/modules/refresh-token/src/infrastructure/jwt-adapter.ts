import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import { env } from '@template/shared';
import type {
  JwtPort,
  AccessPayload,
  RefreshPayload,
  VerifiedAccessPayload,
  VerifiedRefreshPayload,
  ExtractResult,
} from '../domain/jwt-port.js';

export class JwtAdapter implements JwtPort {
  signAccess(payload: AccessPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET_KEY, {
      expiresIn: env.JWT_ACCESS_SECRET_KEY_EXPIRES_IN * 1000,
    });
  }

  signRefresh(payload: RefreshPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET_KEY, {
      expiresIn: env.JWT_REFRESH__SECRET_KEY_EXPIRES_IN * 1000,
    });
  }

  verifyAccess(token: string): VerifiedAccessPayload | null {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET_KEY);

      if (!decoded || typeof decoded === 'string') return null;

      return decoded as unknown as VerifiedAccessPayload;
    } catch {
      return null;
    }
  }

  verifyRefresh(token: string): VerifiedRefreshPayload | null {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET_KEY);

      if (!decoded || typeof decoded === 'string') return null;

      return decoded as unknown as VerifiedRefreshPayload;
    } catch {
      return null;
    }
  }

  extractAccess(req: Request): ExtractResult | null {
    const cookies = req.cookies as Record<string, unknown> | undefined;

    const fromCookie = cookies?.access_token;
    if (typeof fromCookie === 'string') {
      return { token: fromCookie, source: 'cookie' };
    }

    const authorization = req.headers.authorization || '';
    if (authorization.startsWith('Bearer ')) {
      return { token: authorization.slice(7), source: 'header' };
    }

    return null;
  }

  extractRefresh(req: Request): string | null {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const fromCookie = cookies?.refresh_token;

    return typeof fromCookie === 'string' ? fromCookie : null;
  }
}
