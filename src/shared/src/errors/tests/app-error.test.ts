import { describe, it, expect } from 'vitest';
import { AppError } from '../app-error.js';
import { HttpStatus } from '../../constants/http-constants.js';

describe('AppError', () => {
  describe('constructor', () => {
    it('should create an error with the basic provided arguments', () => {
      const error = new AppError('Something went wrong', 418, 'TEAPOT_ERROR');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(418);
      expect(error.code).toBe('TEAPOT_ERROR');

      // Defaults
      expect(error.name).toBe('AppError');
      expect(error.isOperational).toBe(true);
      expect(error.details).toBeUndefined();
      expect(error.cause).toBeUndefined();
      expect(error.stack).toBeDefined();
    });

    it('should apply optional arguments from AppErrorOptions', () => {
      const originalError = new Error('Database disconnected');
      const details = { field: ['is required'] };

      const error = new AppError('Custom Error', 503, 'SERVICE_UNAVAILABLE', {
        name: 'CustomErrorName',
        isOperational: false,
        details,
        cause: originalError,
      });

      expect(error.name).toBe('CustomErrorName');
      expect(error.isOperational).toBe(false);
      expect(error.details).toEqual(details);
      expect(error.cause).toBe(originalError);
    });

    it('should capture stack trace accurately', () => {
      const error = new AppError('Stack Trace Test', 400, 'TEST');
      expect(typeof error.stack).toBe('string');
      // The stack should include the message
      expect(error.stack).toContain('Stack Trace Test');
    });
  });

  describe('Static Factory Methods (4xx Client Errors)', () => {
    it('badRequest() creates a 400 error with defaults or overrides', () => {
      const defaultErr = AppError.badRequest();
      expect(defaultErr.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(defaultErr.message).toBe('Bad request');
      expect(defaultErr.code).toBe('BAD_REQUEST');
      expect(defaultErr.isOperational).toBe(true);

      const details = { email: ['invalid email format'] };
      const customErr = AppError.badRequest('Custom bad request', 'CUSTOM_CODE', details);
      expect(customErr.message).toBe('Custom bad request');
      expect(customErr.code).toBe('CUSTOM_CODE');
      expect(customErr.details).toEqual(details);
    });

    it('unauthorized() creates a 401 error', () => {
      const err = AppError.unauthorized();
      expect(err.statusCode).toBe(HttpStatus.UNAUTHORIZED);
      expect(err.message).toBe('Unauthorized access');
      expect(err.code).toBe('UNAUTHORIZED');

      const customErr = AppError.unauthorized('Not logged in', 'NO_SESSION');
      expect(customErr.message).toBe('Not logged in');
      expect(customErr.code).toBe('NO_SESSION');
    });

    it('forbidden() creates a 403 error', () => {
      const err = AppError.forbidden();
      expect(err.statusCode).toBe(HttpStatus.FORBIDDEN);
      expect(err.message).toBe('Forbidden');
      expect(err.code).toBe('FORBIDDEN');
    });

    it('notFound() creates a 404 error', () => {
      const err = AppError.notFound();
      expect(err.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(err.message).toBe('Resource not found');
      expect(err.code).toBe('NOT_FOUND');

      const customErr = AppError.notFound('User not found', 'USER_MISSING');
      expect(customErr.message).toBe('User not found');
    });

    it('conflict() creates a 409 error', () => {
      const err = AppError.conflict();
      expect(err.statusCode).toBe(HttpStatus.CONFLICT);
      expect(err.message).toBe('Conflict');
      expect(err.code).toBe('CONFLICT');
    });

    it('unprocessable() creates a 422 error with validation details', () => {
      const err = AppError.unprocessable();
      expect(err.statusCode).toBe(HttpStatus.UNPROCESSABLE);
      expect(err.message).toBe('Validation failed');
      expect(err.code).toBe('VALIDATION_ERROR');

      const details = { password: ['too short'] };
      const customErr = AppError.unprocessable('Invalid payload', 'PAYLOAD_ERR', details);
      expect(customErr.message).toBe('Invalid payload');
      expect(customErr.details).toEqual(details);
    });

    it('tooManyRequests() creates a 429 error', () => {
      const err = AppError.tooManyRequests();
      expect(err.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(err.message).toBe('Too many requests');
      expect(err.code).toBe('RATE_LIMITED');
    });
  });

  describe('Static Factory Methods (5xx Internal Errors)', () => {
    it('internal() creates a 500 non-operational error with optional cause', () => {
      const err = AppError.internal();
      expect(err.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(err.message).toBe('Internal server error');
      expect(err.code).toBe('INTERNAL_ERROR');

      // internal() explicitly sets isOperational to false
      expect(err.isOperational).toBe(false);

      const dbError = new Error('Connection timeout');
      const customErr = AppError.internal('Database crash', 'DB_DOWN', dbError);
      expect(customErr.message).toBe('Database crash');
      expect(customErr.code).toBe('DB_DOWN');
      expect(customErr.cause).toBe(dbError);
      expect(customErr.isOperational).toBe(false);
    });
  });
});
