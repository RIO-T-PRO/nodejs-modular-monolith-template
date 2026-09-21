import { describe, it, expect } from 'vitest';
import { omitProperty } from '../omit-prisma-property.js';

describe('omitProperty', () => {
  it('removes the requested key', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omitProperty(obj, ['b'])).toEqual({ a: 1, c: 3 });
  });

  it('removes multiple keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omitProperty(obj, ['a', 'c'])).toEqual({ b: 2 });
  });

  it('returns a shallow copy when nothing is removed', () => {
    const obj = { a: 1, b: 2 };
    const out = omitProperty(obj, []);
    expect(out).toEqual(obj);
    expect(out).not.toBe(obj);
  });

  it('does not mutate the input', () => {
    const obj = { a: 1, b: 2 };
    omitProperty(obj, ['a']);
    expect(obj).toEqual({ a: 1, b: 2 });
  });

  it('preserves reference identity of untouched nested values', () => {
    const nested = { x: 1 };
    const obj = { a: nested, b: 2 };
    const out = omitProperty(obj, ['b']);
    expect(out.a).toBe(nested);
  });
});
