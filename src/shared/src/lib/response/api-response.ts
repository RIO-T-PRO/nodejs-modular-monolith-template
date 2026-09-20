import type { NextFunction, Response, Request, RequestHandler } from 'express';
import { buildMeta, type ApiErrorBody, type Envelope, type ResponseMeta } from './envelope.js';
import { HttpStatus } from '../../constants/http-constants.js';
import { requestIdOf } from './requested-id.js';
import { logger } from '../logger/logger.js';
import { AppError } from '../../errors/app-error.js';

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

  static created<T>(data: T, meta?: Partial<ResponseMeta>): ApiResponse<T> {
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
   * Turn ANY thrown value into an ApiResponse — the single source of truth for
   * "what does the client see when something goes wrong".
   *   - AppError      → its own status/code/message/details (warn if operational, error otherwise)
   *   - anything else → opaque 500 (logged at error with full stack)
   */
  static fromError(err: unknown, res?: Response): ApiResponse<never> {
    const requestId = res ? requestIdOf(res) : undefined;

    // Body already flushed (streaming, SSE, manually-ended route) — we can't
    // send JSON anymore. Log the situation and hand back a shell; callers
    // decide whether to tear the stream down.
    if (res?.headersSent) {
      logger.error(
        { requestId, err },
        'Error occurred after HTTP headers were already sent — cannot send JSON payload',
      );
      return new ApiResponse(HttpStatus.INTERNAL_SERVER_ERROR, {
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
      // Operational = expected domain failure → warn. Non-operational = bug → error.
      if (err.isOperational) logger.warn(meta, err.message);
      else logger.error(meta, err.message);

      const body: ApiErrorBody = {
        name: err.name,
        code: err.code,
        message: err.message,
      };
      if (err.details) body.details = err.details;

      return new ApiResponse(err.statusCode, {
        success: false,
        error: body,
        meta: buildMeta({ requestId }),
      });
    }

    logger.error({ requestId, err }, 'Unhandled error');
    return new ApiResponse(HttpStatus.INTERNAL_SERVER_ERROR, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
      meta: buildMeta({ requestId }),
    });
  }

  /* -------------------------------- Instance -------------------------------- */

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

  /* ---------------------------------------------------------------------- */
  /*                        Express integration (static)                    */
  /* ---------------------------------------------------------------------- */

  /**
   * Wrap an async route handler. Sends the returned `ApiResponse`, or
   * converts any thrown value via `fromError`.
   *
   * Usage:  router.get('/x', ApiResponse.handler(async (req) => { ... }))
   */
  static handler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
  ): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next))
        .then((result) => {
          // Route streamed / wrote the response directly — nothing to do.
          if (res.headersSent) return;

          // Explicit ApiResponse → send as-is.
          if (result instanceof ApiResponse) {
            result.send(res);
            return;
          }

          // Raw return value → wrap in a 200 envelope.
          if (result !== undefined) {
            ApiResponse.ok(result).send(res);
            return;
          }

          // undefined + no headers = programmer error. Log with context so
          // the offending route is obvious, then return an opaque 500.
          logger.error(
            { url: req.originalUrl, method: req.method },
            'Route handler returned undefined without sending a response',
          );
          ApiResponse.fromError(new Error('Route failed to send a response payload.'), res).send(
            res,
          );
        })
        .catch((err: unknown) => {
          // Body already flushed — hand off to Express for socket teardown.
          if (res.headersSent) {
            next(err);
            return;
          }
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
        // fromError handles the STREAM_ERROR logging; then let Express tear
        // the socket down. `void` because the return value is unused here.
        void ApiResponse.fromError(err, res);
        next(err);
        return;
      }
      ApiResponse.fromError(err, res).send(res);
    };
  };
}
