import { type HttpStatusCode, HttpStatus } from '../constants/http-constants.js';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: HttpStatusCode = HttpStatus.BAD_REQUEST,
    public readonly code: string = 'BAD_REQUEST',
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
