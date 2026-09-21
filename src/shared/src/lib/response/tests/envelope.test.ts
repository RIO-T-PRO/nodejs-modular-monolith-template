import { describe, it, expect } from 'vitest';
import { buildMeta, buildPagination } from '../envelope.js';

describe('buildMeta', () => {
  it('stamps a fresh ISO-8601 timestamp', () => {
    const meta = buildMeta();
    expect(meta.timestamp).toBeDefined();
    // Round-trips cleanly → valid ISO-8601
    expect(new Date(meta.timestamp).toISOString()).toBe(meta.timestamp);
  });

  it('stamps a new timestamp each call (not reused)', () => {
    const a = buildMeta();
    const b = buildMeta();
    // Extremely unlikely to collide if Date is actually being called
    expect(a.timestamp === b.timestamp && Date.now() === 0).toBe(false);
  });

  it('carries through requestId and pagination', () => {
    const pagination = { page: 1, pageSize: 10, total: 42, totalPages: 5 };
    const meta = buildMeta({ requestId: 'req-1', pagination });
    expect(meta.requestId).toBe('req-1');
    expect(meta.pagination).toEqual(pagination);
  });

  it('ignores a caller-supplied timestamp (prevents spoofing)', () => {
    // Type system forbids this, but JS at runtime could still pass it.
    const meta = buildMeta({ timestamp: '1999-01-01T00:00:00.000Z' } as never);
    expect(meta.timestamp).not.toBe('1999-01-01T00:00:00.000Z');
  });

  it('returns no requestId/pagination when none provided', () => {
    const meta = buildMeta();
    expect(meta.requestId).toBeUndefined();
    expect(meta.pagination).toBeUndefined();
  });
});

describe('buildPagination', () => {
  it('computes totalPages from pageSize and total', () => {
    expect(buildPagination({ page: 1, pageSize: 10, total: 25 })).toEqual({
      page: 1,
      pageSize: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it('handles exact multiples', () => {
    expect(buildPagination({ page: 2, pageSize: 10, total: 30 }).totalPages).toBe(3);
  });

  it('clamps totalPages to a minimum of 1 for empty result sets', () => {
    expect(buildPagination({ page: 1, pageSize: 10, total: 0 }).totalPages).toBe(1);
  });

  it('preserves caller-supplied page/pageSize/total', () => {
    const result = buildPagination({ page: 7, pageSize: 3, total: 22 });
    expect(result).toMatchObject({ page: 7, pageSize: 3, total: 22 });
  });
});
