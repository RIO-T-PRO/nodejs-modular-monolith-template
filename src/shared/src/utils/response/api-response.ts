import type { NextFunction, Response, Request, RequestHandler } from 'express';
import { AppError } from '../../errors/app-error.js';
import { logger } from '../../lib/logger.js';
import { HttpStatus } from '../../constants/http-constants.js';
import { buildMeta, type ApiErrorBody, type Envelope, type ResponseMeta } from './envelope.js';

const requestIdOf = (res: Response): string | undefined =>
  (res.locals?.requestId as string | undefined) ?? undefined;

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
   * Turn ANY thrown value into an ApiResponse. Single source of truth for
   * "what does the client see when something goes wrong".
   *   - AppError      → its own status/code/message/details (logged at warn)
   *   - anything else → opaque 500 (logged at error, full stack)
   */
  static fromError(err: unknown, res?: Response): ApiResponse<never> {
    const requestId = res ? requestIdOf(res) : undefined;

    // If a streaming route exploded mid-stream, logs must explicitly state this
    if (res?.headersSent) {
      logger.error(
        'Error occurred after HTTP headers were already sent. Cannot send JSON payload.',
        {
          requestId,
          err,
        },
      );
      // Short-circuit: Return a shell; the handler layer handles dropping this gracefully
      return new ApiResponse(HttpStatus.INTERNAL_SERVER_ERROR, {
        success: false,
        error: { code: 'STREAM_ERROR', message: 'Headers already sent' },
        meta: buildMeta({ requestId }),
      });
    }

    if (err instanceof AppError) {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const logFn = err.isOperational ? logger.warn : logger.error;
      logFn(err.message, {
        name: err.name,
        code: err.code,
        statusCode: err.statusCode,
        requestId,
        err,
      });

      // FIX: Added name validation mapping from your custom errors
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

    logger.error('Unhandled error', { requestId, err });
    return new ApiResponse(HttpStatus.INTERNAL_SERVER_ERROR, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
      meta: buildMeta({ requestId }),
    });
  }

  /* -------------------------------- Instance -------------------------------- */

  send(res: Response): void {
    if (res.headersSent) return; // Safeguard if explicitly called late

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
  static handler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
  ): RequestHandler => {
    return (req: Request, res: Response, _next: NextFunction): void => {
      Promise.resolve(fn(req, res, _next))
        .then((result) => {
          if (res.headersSent) return; // Streaming occurred directly via controller

          // FIX NUANCE 1: If developer explicitly returns an ApiResponse instance, use it
          if (result instanceof ApiResponse) {
            result.send(res);
          }
          // Automatically safely wrap raw returns so routes never hang
          else if (result !== undefined) {
            ApiResponse.ok(result).send(res);
          }
          // If they returned undefined but forgot to stream or terminate the request manually
          else {
            logger.error(
              `Route handler returned undefined without sending headers at ${req.originalUrl}`,
            );
            ApiResponse.fromError(new Error('Route failed to send a response payload.'), res).send(
              res,
            );
          }
        })
        .catch((err: unknown) => {
          if (res.headersSent) {
            // Can't mutate body anymore, let global handler kick it down the line
            _next(err);
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
        // Trigger specific logs inside fromError, then handoff safely to standard Express stream teardown
        ApiResponse.fromError(err, res);
        next(err);
        return;
      }
      ApiResponse.fromError(err, res).send(res);
    };
  };
}
