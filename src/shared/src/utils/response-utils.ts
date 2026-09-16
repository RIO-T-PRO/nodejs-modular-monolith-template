import type { Response } from 'express';

export const sendResponse = (
  res: Response,
  httpCode: number,
  message: string,
  data?: unknown,
): Response => {
  return res.status(httpCode).json({
    status: httpCode,
    message,
    data,
  });
};
