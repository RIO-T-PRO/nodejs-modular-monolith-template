export const serializeError = (e: unknown): unknown => {
  if (!(e instanceof Error)) return e;
  return {
    name: e.name,
    message: e.message,
    stack: e.stack,
    ...(e.cause !== undefined ? { cause: serializeError(e.cause) } : {}),
  };
};

export const normalizeMeta = (
  meta?: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    out[key] = value instanceof Error ? serializeError(value) : value;
  }
  return out;
};
