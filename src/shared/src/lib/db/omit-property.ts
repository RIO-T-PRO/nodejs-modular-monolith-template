export const omitProperty = <T extends object, K extends keyof T>(
  obj: T,
  keysToRemove: readonly K[],
): Omit<T, K> => {
  const keysToOmit = new Set<string>(keysToRemove as readonly string[]);

  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keysToOmit.has(key))) as Omit<
    T,
    K
  >;
};
