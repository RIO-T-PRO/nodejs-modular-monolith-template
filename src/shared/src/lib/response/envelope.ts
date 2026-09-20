/**
 * Transport-agnostic envelope shapes. No Express, no AppError, no logger —
 * safe to import from any layer, including pure domain/application code.
 */

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ResponseMeta {
  /** ISO-8601, stamped by `buildMeta` — not caller-settable. */
  timestamp: string;
  requestId?: string | undefined;
  pagination?: Pagination | undefined;
}

export interface ApiErrorBody {
  /** Error class name, e.g. "UserNotFoundError". */
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

/**
 * Anything a caller may contribute to the meta block. `timestamp` is
 * intentionally omitted — it's always stamped here so it can't be spoofed
 * or left stale by a reused meta object.
 */
export type ResponseMetaInput = Omit<Partial<ResponseMeta>, 'timestamp'>;

/** Build the `meta` block, stamping a fresh timestamp. */
export const buildMeta = (meta?: ResponseMetaInput): ResponseMeta => ({
  ...meta,
  timestamp: new Date().toISOString(),
});

/** Convenience builder for list endpoints. */
export const buildPagination = (input: {
  page: number;
  pageSize: number;
  total: number;
}): Pagination => ({
  ...input,
  totalPages: Math.max(1, Math.ceil(input.total / input.pageSize)),
});
