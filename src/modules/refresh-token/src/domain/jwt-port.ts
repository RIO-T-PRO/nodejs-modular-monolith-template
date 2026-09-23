import type { Request } from 'express';

export interface AccessPayload {
  userId: string;
  email: string;
  fullname: string;
  [key: string]: unknown;
}

export interface RefreshPayload {
  userId: string;
}

export interface VerifiedAccessPayload extends AccessPayload {
  iat: number;
  exp: number;
}

export interface VerifiedRefreshPayload extends RefreshPayload {
  iat: number;
  exp: number;
}

export interface ExtractResult {
  token: string;
  source: 'cookie' | 'header';
}

export interface JwtPort {
  signAccess(payload: AccessPayload): string;
  signRefresh(payload: RefreshPayload): string;
  verifyAccess(token: string): VerifiedAccessPayload | null;
  verifyRefresh(token: string): VerifiedRefreshPayload | null;
  extractAccess(req: Request): ExtractResult | null;
  extractRefresh(req: Request): string | null;
}
