import { HttpStatus } from '../../constants/http-constants.js';
import { AppError } from '../app-error.js';

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, HttpStatus.CONFLICT, 'CONFLICT');
  }
}
