import { HttpStatus } from '../constants/http-constants.js';
import type { AppErrorOptions } from './interfaces/app-error-interface.js';

export class AppError extends Error {
  public readonly details?: Record<string, string[]> | undefined;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    options: AppErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = options.name ?? this.constructor.name;
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    Error.captureStackTrace(this, this.constructor);
  }

  /* ----------------------------- 4xx client errors ---------------------------- */

  static badRequest(
    message = 'Bad request',
    code = 'BAD_REQUEST',
    details?: Record<string, string[]>,
  ) {
    return new AppError(message, HttpStatus.BAD_REQUEST, code, { details });
  }

  static unauthorized(message = 'Unauthorized access', code = 'UNAUTHORIZED') {
    return new AppError(message, HttpStatus.UNAUTHORIZED, code);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new AppError(message, HttpStatus.FORBIDDEN, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new AppError(message, HttpStatus.NOT_FOUND, code);
  }

  static conflict(message = 'Conflict', code = 'CONFLICT') {
    return new AppError(message, HttpStatus.CONFLICT, code);
  }

  static unprocessable(
    message = 'Validation failed',
    code = 'VALIDATION_ERROR',
    details?: Record<string, string[]>,
  ) {
    return new AppError(message, HttpStatus.UNPROCESSABLE, code, { details });
  }

  static tooManyRequests(message = 'Too many requests', code = 'RATE_LIMITED') {
    return new AppError(message, HttpStatus.TOO_MANY_REQUESTS, code);
  }

  /* --------------------------- 5xx / internal errors ------------------------- */

  /**
   * Use for invariant violations and impossible states.
   * Marked non-operational so the error handler logs the full stack at `error`.
   */
  static internal(message = 'Internal server error', code = 'INTERNAL_ERROR', cause?: unknown) {
    return new AppError(message, HttpStatus.INTERNAL_SERVER_ERROR, code, {
      cause,
      isOperational: false,
    });
  }
}
