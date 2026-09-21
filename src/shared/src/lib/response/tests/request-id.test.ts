import { describe, it, expect } from 'vitest';
import { requestIdOf } from '../requested-id.js';

const fakeRes = (locals: unknown) => ({ locals }) as never;

describe('requestIdOf', () => {
  it('returns the requestId stored on res.locals', () => {
    expect(requestIdOf(fakeRes({ requestId: 'abc-123' }))).toBe('abc-123');
  });

  it('returns undefined when locals exists but has no requestId', () => {
    expect(requestIdOf(fakeRes({}))).toBeUndefined();
  });

  it('returns undefined when locals is undefined', () => {
    expect(requestIdOf({} as never)).toBeUndefined();
  });

  it('returns undefined when requestId is not a string', () => {
    expect(requestIdOf(fakeRes({ requestId: 42 }))).toBeUndefined();
  });

  it('returns undefined when requestId is null', () => {
    expect(requestIdOf(fakeRes({ requestId: null }))).toBeUndefined();
  });

  it('returns undefined when requestId is an empty string', () => {
    expect(requestIdOf(fakeRes({ requestId: '' }))).toBeUndefined();
  });

  it('returns undefined when requestId is a String object wrapper', () => {
    // typeof new String('x') === 'object' — correctly rejected.
    // Guards against someone doing `new String(id)` in middleware.
    expect(requestIdOf(fakeRes({ requestId: new String('abc') }))).toBeUndefined();
  });

  it('returns the requestId when it is a non-empty string', () => {
    expect(requestIdOf(fakeRes({ requestId: 'a' }))).toBe('a');
  });
});
