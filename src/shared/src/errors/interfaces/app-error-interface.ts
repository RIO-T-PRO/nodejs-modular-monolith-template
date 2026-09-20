export interface AppErrorOptions {
  name?: string | undefined;
  /** Field-level validation details, e.g. { email: ['Invalid format'] } */
  details?: Record<string, string[]> | undefined;
  /** Underlying error, preserved for logs (never sent to the client). */
  cause?: unknown;
  /**
   * false = programmer error / invariant violation (logged at error).
   * true  = expected domain failure (logged at warn). Default: true.
   */
  isOperational?: boolean | undefined;
}
