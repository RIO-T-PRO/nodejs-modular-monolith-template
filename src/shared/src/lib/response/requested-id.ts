import type { Response } from 'express';

export const requestIdOf = (res: Response): string | undefined => {
  const id: unknown = res.locals?.requestId;

  if (typeof id === 'string' && id.length > 0) {
    return id;
  }

  return undefined;
};
