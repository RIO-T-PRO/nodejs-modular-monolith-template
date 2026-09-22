import type { NextFunction, Response, Request, RequestHandler } from 'express';
import { buildMeta, type ApiErrorBody, type Envelope, type ResponseMeta } from './envelope.js';
import { HttpStatus } from '../../constants/http-constants.js';
import { requestIdOf } from './requested-id.js';
import { logger } from '../logger/logger.js';
import { AppError } from '../../errors/app-error.js';

/**
 * Private class used strictly to hold the response data and provide a `send`
 * method. It is not exported, keeping the public API purely functional.
 */
export class InternalApiResponse<T = unknown> {
  constructor(
    public readonly statusCode: number,
    private readonly payload: Envelope<T>,
  ) {}

  send(res: Response): void {
    if (res.headersSent) return;

    if (this.statusCode === HttpStatus.NO_CONTENT) {
      res.status(this.statusCode).end();
      return;
    }
    res.status(this.statusCode).json(this.payload);
  }

  toJSON(): Envelope<T> {
    return this.payload;
  }
}

/* -------------------------------------------------------------------------- */
/* Factory Functions                                                       */
/* -------------------------------------------------------------------------- */

const ok = <T>(data: T, opts: { status?: number; meta?: Partial<ResponseMeta> } = {}) => {
  return new InternalApiResponse<T>(opts.status ?? HttpStatus.OK, {
    success: true,
    data,
    meta: buildMeta(opts.meta),
  });
};

const created = <T>(data: T, meta?: Partial<ResponseMeta>) => {
  return new InternalApiResponse<T>(HttpStatus.CREATED, {
    success: true,
    data,
    meta: buildMeta(meta),
  });
};

const noContent = () => {
  return new InternalApiResponse<null>(HttpStatus.NO_CONTENT, {
    success: true,
    data: null,
    meta: buildMeta(),
  });
};

const fail = (
  error: ApiErrorBody,
  opts: { status?: number; meta?: Partial<ResponseMeta> } = {},
) => {
  return new InternalApiResponse<never>(opts.status ?? HttpStatus.BAD_REQUEST, {
    success: false,
    error,
    meta: buildMeta(opts.meta),
  });
};

const fromError = (err: unknown, res?: Response) => {
  const requestId = res ? requestIdOf(res) : undefined;

  if (res?.headersSent) {
    logger.error(
      { requestId, err },
      'Error occurred after HTTP headers were already sent — cannot send JSON payload',
    );
    return new InternalApiResponse<never>(HttpStatus.INTERNAL_SERVER_ERROR, {
      success: false,
      error: { code: 'STREAM_ERROR', message: 'Headers already sent' },
      meta: buildMeta({ requestId }),
    });
  }

  if (err instanceof AppError) {
    const meta = {
      name: err.name,
      code: err.code,
      statusCode: err.statusCode,
      requestId,
      err,
    };

    if (err.isOperational) logger.warn(meta, err.message);
    else logger.error(meta, err.message);

    const body: ApiErrorBody = {
      name: err.name,
      code: err.code,
      message: err.message,
    };
    if (err.details) body.details = err.details;

    return new InternalApiResponse<never>(err.statusCode, {
      success: false,
      error: body,
      meta: buildMeta({ requestId }),
    });
  }

  logger.error({ requestId, err }, 'Unhandled error');
  return new InternalApiResponse<never>(HttpStatus.INTERNAL_SERVER_ERROR, {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    meta: buildMeta({ requestId }),
  });
};

/* -------------------------------------------------------------------------- */
/* Express Integrations                                                    */
/* -------------------------------------------------------------------------- */

const handler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await fn(req, res, next);

      if (res.headersSent) return;

      // Explicit Api format returned -> send as-is
      if (result instanceof InternalApiResponse) {
        result.send(res);
        return;
      }

      // Raw return value -> wrap in a 200 envelope
      if (result !== undefined) {
        ok(result).send(res);
        return;
      }

      logger.error(
        { url: req.originalUrl, method: req.method },
        'Route handler returned undefined without sending a response',
      );
      fromError(new Error('Route failed to send a response payload.'), res).send(res);
    } catch (err: unknown) {
      if (res.headersSent) {
        next(err);
        return;
      }
      fromError(err, res).send(res);
    }
  };
};

const errorMiddleware = () => {
  return (err: unknown, _req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
      void fromError(err, res);
      next(err);
      return;
    }
    fromError(err, res).send(res);
  };
};

export { ok, created, noContent, fail, fromError, handler, errorMiddleware };
