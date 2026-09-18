/**
 * Transport-agnostic envelope shapes. No Express, no AppError, no logger —
 * safe to import from any layer, including pure domain/application code.
 */

export interface ResponseMeta {
  timestamp: string;
  requestId?: string | undefined;
  pagination?:
    | {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      }
    | undefined;
}

export interface ApiErrorBody {
  /** Explicit error class designation name, e.g. "UserNotFoundError". */
  name?: string | undefined;
  /** Machine-readable code, e.g. "USER_NOT_FOUND", "VALIDATION_ERROR". */
  code: string;
  /** Human-readable message, safe to show to clients. */
  message: string;
  /** Optional field-level validation details. */
  details?: Record<string, string[]> | undefined;
}

export type Envelope<T> =
  | { success: true; data: T; meta: ResponseMeta }
  | { success: false; error: ApiErrorBody; meta: ResponseMeta };

/** Build the `meta` block, stamping a fresh timestamp. */
export const buildMeta = (meta?: Partial<ResponseMeta>): ResponseMeta => ({
  timestamp: new Date().toISOString(),
  ...meta,
});
