// Call shapes the logger accepts.
export type LogFn = {
  (message: string): void;
  (meta: Record<string, unknown>, message?: string): void; // ✓ matches { a: 1 }
};

export interface Logger {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  debug: LogFn;
  /** Returns a logger that merges `bound` into every entry's meta. */
  child(bound: Record<string, unknown>): Logger;
}
