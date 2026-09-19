import type { Response } from 'express';

export const requestIdOf = (res: Response): string | undefined =>
  (res.locals?.requestId as string | undefined) ?? undefined;
