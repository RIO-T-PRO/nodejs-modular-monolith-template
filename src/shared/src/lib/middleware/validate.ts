import type { NextFunction, Request, Response } from 'express';
import type { ZodError, z } from 'zod';
import { HttpStatus } from '../../constants/http-constants.js';

/**
 * Extracts the first error message and sanitizes it to keep responses clean.
 */
const handleZodError = (res: Response, error: ZodError): void => {
  const firstIssue = error.issues[0];
  const message = firstIssue?.message.replace(/[^a-zA-Z0-9 ]/g, '') || 'Validation failed';

  res.status(HttpStatus.BAD_REQUEST).json({
    success: false,
    message,
  });
};

const body = (schema: z.ZodType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const result = await schema.safeParseAsync(req.body);

    if (!result.success) {
      handleZodError(res, result.error);
      return;
    }

    req.body = result.data; // Keeps Zod coercion/defaults working
    next();
  };
};

const params = (schema: z.ZodType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const result = await schema.safeParseAsync(req.params);

    if (!result.success) {
      handleZodError(res, result.error);
      return;
    }

    req.params = result.data as Request['params'];
    next();
  };
};

const query = (schema: z.ZodType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const result = await schema.safeParseAsync(req.query);

    if (!result.success) {
      handleZodError(res, result.error);
      return;
    }

    Object.defineProperty(req, 'query', { value: result.data, writable: true });
    next();
  };
};

export { body, params, query };
