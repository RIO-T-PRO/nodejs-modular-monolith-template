import type { NextFunction, Response, Request } from 'express';
import { AppError } from '../../errors/app-error.js';
import { logger } from '../../lib/logger.js';
import { HttpStatus } from '../../constants/http-constants.js';
import { buildMeta, type ApiErrorBody, type Envelope, type ResponseMeta } from './envelope.js';

const requestIdOf = (res: Response): string | undefined =>
  (res.locals?.requestId as string | undefined) ?? undefined;

/* -------------------------------------------------------------------------- */
/*                              ApiResponse<T>                                */
/* -------------------------------------------------------------------------- */

export class ApiResponse<T = unknown> {
  private constructor(
    public readonly statusCode: number,
    private readonly payload: Envelope<T>,
  ) {}

  /* --------------------------- Success factories ----------------------------- */

  static ok<T>(
    data: T,
    opts: { status?: number | undefined; meta?: Partial<ResponseMeta> | undefined } = {},
  ): ApiResponse<T> {
    return new ApiResponse(opts.status ?? HttpStatus.OK, {
      success: true,
      data,
      meta: buildMeta(opts.meta),
    });
  }

  static created<T>(data: T, meta?: Partial<ResponseMeta> | undefined): ApiResponse<T> {
    return new ApiResponse(HttpStatus.CREATED, {
      success: true,
      data,
      meta: buildMeta(meta),
    });
  }

  static noContent(): ApiResponse<null> {
    return new ApiResponse(HttpStatus.NO_CONTENT, {
      success: true,
      data: null,
      meta: buildMeta(),
    });
  }

  /* --------------------------- Failure factories ----------------------------- */

  static fail(
    error: ApiErrorBody,
    opts: { status?: number | undefined; meta?: Partial<ResponseMeta> | undefined } = {},
  ): ApiResponse<never> {
    return new ApiResponse(opts.status ?? HttpStatus.BAD_REQUEST, {
      success: false,
      error,
      meta: buildMeta(opts.meta),
    });
  }

  /**
   * Turn ANY thrown value into an ApiResponse. Single source of truth for
   * "what does the client see when something goes wrong".
   *   - AppError      → its own status/code/message/details (logged at warn)
   *   - anything else → opaque 500 (logged at error, full stack)
   */
  static fromError(err: unknown, res?: Response): ApiResponse<never> {
    const requestId = res ? requestIdOf(res) : undefined;

    if (err instanceof AppError) {
      const logFn = err.isOperational ? logger.warn : logger.error;
      logFn(err.message, {
        code: err.code,
        statusCode: err.statusCode,
        requestId,
        err,
      });

      const body: ApiErrorBody = { code: err.code, message: err.message };
      if (err.details) body.details = err.details;

      return new ApiResponse(err.statusCode, {
        success: false,
        error: body,
        meta: buildMeta({ requestId }),
      });
    }

    logger.error('Unhandled error', { requestId, err });
    return new ApiResponse(HttpStatus.INTERNAL_SERVER_ERROR, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
      meta: buildMeta({ requestId }),
    });
  }

  /* -------------------------------- Instance -------------------------------- */

  send(res: Response): void {
    if (this.statusCode === HttpStatus.NO_CONTENT) {
      res.status(this.statusCode).end();
      return;
    }
    res.status(this.statusCode).json(this.payload);
  }

  toJSON(): Envelope<T> {
    return this.payload;
  }

  /* ---------------------------------------------------------------------- */
  /*                        Express integration (static)                    */
  /* ---------------------------------------------------------------------- */

  /**
   * Wrap an async route handler. Sends the returned `ApiResponse`, or
   * converts any thrown value via `fromError`. No next() on error — once
   * we've sent the envelope, Express has nothing left to do.
   *
   * Usage:  router.get('/x', ApiResponse.handler(async (req) => { ... }))
   */
  static handler = <T extends (...args: unknown[]) => Promise<unknown>>(fn: T) => {
    return (req: Request, res: Response, _next: NextFunction): void => {
      Promise.resolve(fn(req, res))
        .then((result) => {
          if (result instanceof ApiResponse) result.send(res);
        })
        .catch((err: unknown) => {
          ApiResponse.fromError(err, res).send(res);
        });
    };
  };

  /**
   * Express error middleware. Register LAST in the shell. Catches anything
   * that escaped `handler()` — throws from body-parser, auth, request-id,
   * unwrapped routers, etc.
   *
   * Usage:  app.use(ApiResponse.errorMiddleware())
   */
  static errorMiddleware = () => {
    return (err: unknown, _req: Request, res: Response, next: NextFunction): void => {
      if (res.headersSent) {
        // Streaming started; can't send a JSON body. Let Express tear down.
        next(err);
        return;
      }
      ApiResponse.fromError(err, res).send(res);
    };
  };
}
