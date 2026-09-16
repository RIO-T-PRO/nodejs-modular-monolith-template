export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Type extraction so you can use it in function signatures
export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];

export const HttpMessage = {
  SUCCESS: 'Success',
  CREATED: 'Created successfully',
  BAD_REQUEST: 'Bad request',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not found',
  CONFLICT: 'Conflict',
  SERVER_ERROR: 'Server error',
  WELCOME: 'Welcome to the API',
  INVALID_ROUTE: 'Invalid route',
  INVALID_METHOD: 'Invalid method',
  ALREADY_EXISTS: 'Already exists',
} as const;
