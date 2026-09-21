import { describe, it, expect } from 'vitest';
import { normalizeMeta, serializeError } from '../normalize-meta.js';

describe('serializeError', () => {
  it('passes through non-Error values untouched', () => {
    expect(serializeError('boom')).toBe('boom');
    expect(serializeError(42)).toBe(42);
    expect(serializeError(null)).toBeNull();
    expect(serializeError(undefined)).toBeUndefined();
    expect(serializeError({ code: 'X' })).toEqual({ code: 'X' });
  });

  it('expands an Error into name/message/stack', () => {
    const err = new Error('kaboom');
    const out = serializeError(err) as Record<string, unknown>;

    expect(out.name).toBe('Error');
    expect(out.message).toBe('kaboom');
    expect(out.stack).toBeTypeOf('string');
    expect(out).not.toHaveProperty('cause');
  });

  it('falls back to "Error" for a bare subclass (matches Error.prototype.name)', () => {
    class Bare extends Error {}
    const out = serializeError(new Bare('x')) as Record<string, unknown>;
    expect(out.name).toBe('Error');
  });

  it('preserves the instance name when the class opts in', () => {
    class CustomError extends Error {
      constructor(msg: string) {
        super(msg);
        this.name = 'CustomError';
      }
    }
    const out = serializeError(new CustomError('nope')) as Record<string, unknown>;
    expect(out.name).toBe('CustomError');
  });

  it('recursively serializes a nested cause', () => {
    const root = new Error('root');
    const mid = new Error('mid', { cause: root });
    const top = new Error('top', { cause: mid });

    const out = serializeError(top) as Record<string, unknown>;
    expect(out.message).toBe('top');

    const cause1 = out.cause as Record<string, unknown>;
    expect(cause1.message).toBe('mid');

    const cause2 = cause1.cause as Record<string, unknown>;
    expect(cause2.message).toBe('root');
  });

  it('omits cause when it is undefined', () => {
    const err = new Error('plain');
    const out = serializeError(err) as Record<string, unknown>;
    expect('cause' in out).toBe(false);
  });

  it('serializes a non-Error cause as-is', () => {
    const err = new Error('wrapper', { cause: { code: 'DB_DOWN' } });
    const out = serializeError(err) as Record<string, unknown>;
    expect(out.cause).toEqual({ code: 'DB_DOWN' });
  });

  it('preserves a null cause', () => {
    const err = new Error('x', { cause: null });
    const out = serializeError(err) as Record<string, unknown>;
    expect('cause' in out).toBe(true);
    expect(out.cause).toBeNull();
  });

  it('does not mutate the original Error', () => {
    const err = new Error('x');
    serializeError(err);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('x');
  });
});

describe('normalizeMeta', () => {
  it('returns undefined when meta is undefined', () => {
    expect(normalizeMeta(undefined)).toBeUndefined();
  });

  it('returns undefined for an empty object (collapses to undefined)', () => {
    expect(normalizeMeta({})).toBeUndefined();
  });

  it('passes primitives through', () => {
    expect(normalizeMeta({ a: 1, b: 'two', c: true, d: null })).toEqual({
      a: 1,
      b: 'two',
      c: true,
      d: null,
    });
  });

  it('expands Error values via serializeError', () => {
    const err = new Error('boom');
    const out = normalizeMeta({ err })!;
    expect(out.err).toMatchObject({ name: 'Error', message: 'boom' });
    expect((out.err as Record<string, unknown>).stack).toBeTypeOf('string');
  });

  it('handles mixed Error and non-Error values', () => {
    const out = normalizeMeta({
      userId: 'u1',
      err: new Error('x'),
      code: 500,
    })!;
    expect(out.userId).toBe('u1');
    expect(out.code).toBe(500);
    expect(out.err).toMatchObject({ name: 'Error', message: 'x' });
  });

  it('preserves nested objects and arrays as-is (no deep walk)', () => {
    const nested = { a: { b: 1 } };
    const arr = [1, 2, 3];
    const out = normalizeMeta({ nested, arr })!;
    expect(out.nested).toBe(nested);
    expect(out.arr).toBe(arr);
  });

  it('does not deep-walk into plain objects (Errors nested inside are untouched)', () => {
    const nested = { inner: new Error('deep') };
    const out = normalizeMeta({ nested })!;
    expect(out.nested).toBe(nested);
    expect((out.nested as { inner: Error }).inner).toBeInstanceOf(Error);
  });

  it('does not mutate the input object', () => {
    const input = { a: 1, err: new Error('x') };
    normalizeMeta(input);
    expect(input.err).toBeInstanceOf(Error);
    expect(input.a).toBe(1);
  });
});
