import { HttpStatus } from '../../constants/http-constants.js';
import { AppError } from '../app-error.js';

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HttpStatus.NOT_FOUND, 'NOT_FOUND');
  }
}
