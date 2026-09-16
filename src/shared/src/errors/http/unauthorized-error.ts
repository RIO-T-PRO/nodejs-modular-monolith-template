import { HttpStatus } from '../../constants/http-constants.js';
import { AppError } from '../app-error.js';

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}
