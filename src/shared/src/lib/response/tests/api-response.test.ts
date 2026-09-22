/* eslint-disable @typescript-eslint/require-await */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

/* ------------------------------- Mocks ---------------------------------- */

// Path must resolve to the SAME module the source files import:
vi.mock('../../logger/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { Api } from '../index.js';
import { logger } from '../../logger/logger.js';
import { AppError } from '../../../errors/app-error.js';

type ResMock = {
  locals: Record<string, unknown>;
  headersSent: boolean;
  status: Mock;
  json: Mock;
  end: Mock;
};

const makeRes = (overrides: Partial<ResMock> = {}): ResMock => {
  const res: Partial<ResMock> = {
    locals: {},
    headersSent: false,
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
    ...overrides,
  };
  // enable chaining: res.status(...).json(...) / res.status(...).end()
  (res.status as Mock).mockReturnValue(res);
  return res as ResMock;
};

const makeReq = (overrides = {}) =>
  ({ originalUrl: '/test', method: 'GET', ...overrides }) as never;

const flushAsync = () => new Promise<void>((resolve) => setImmediate(resolve));

beforeEach(() => {
  vi.clearAllMocks();
});

/* ---------------------------- Success factories -------------------------- */

describe('Api.ok', () => {
  it('defaults to 200 and wraps data in a success envelope', () => {
    const res = Api.ok({ id: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.toJSON()).toMatchObject({
      success: true,
      data: { id: 1 },
      meta: { timestamp: expect.any(String) },
    });
  });

  it('honours a custom status and meta', () => {
    const res = Api.ok({ id: 1 }, { status: 202, meta: { requestId: 'r1' } });
    expect(res.statusCode).toBe(202);
    expect(res.toJSON().meta.requestId).toBe('r1');
  });
});

describe('Api.created', () => {
  it('uses 201', () => {
    const res = Api.created({ id: 9 }, { requestId: 'req-x' });
    expect(res.statusCode).toBe(201);
    expect(res.toJSON()).toMatchObject({
      success: true,
      data: { id: 9 },
      meta: { requestId: 'req-x' },
    });
  });
});

describe('Api.noContent', () => {
  it('uses 204 and null data', () => {
    const res = Api.noContent();
    expect(res.statusCode).toBe(204);
    expect(res.toJSON()).toMatchObject({ success: true, data: null });
  });
});

/* ---------------------------- Failure factories -------------------------- */

describe('Api.fail', () => {
  it('defaults to 400 with the provided error body', () => {
    const res = Api.fail({ code: 'BAD', message: 'nope' });
    expect(res.statusCode).toBe(400);
    expect(res.toJSON()).toMatchObject({
      success: false,
      error: { code: 'BAD', message: 'nope' },
    });
  });

  it('honours custom status and meta', () => {
    const res = Api.fail(
      { code: 'TEAPOT', message: 'short and stout' },
      { status: 418, meta: { requestId: 'x' } },
    );
    expect(res.statusCode).toBe(418);
    expect(res.toJSON().meta.requestId).toBe('x');
  });
});

/* ------------------------------- fromError ------------------------------- */

describe('Api.fromError', () => {
  it('maps a non-operational AppError to error-level logging', () => {
    const err = new AppError('boom', 500, 'BOOM', { isOperational: false });
    const out = Api.fromError(err, makeRes() as never);

    expect(out.statusCode).toBe(500);
    expect(out.toJSON()).toMatchObject({
      success: false,
      error: { name: 'AppError', code: 'BOOM', message: 'boom' },
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('maps an operational AppError to warn-level logging', () => {
    const err = new AppError('not found', 404, 'NOT_FOUND', { isOperational: true });
    const out = Api.fromError(err, makeRes() as never);
    expect(out.statusCode).toBe(404);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('defaults to operational when options are omitted (warn-level)', () => {
    const err = new AppError('oops', 400, 'OOPS');
    Api.fromError(err, makeRes() as never);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('includes details when present', () => {
    const err = new AppError('validation', 422, 'VALIDATION_ERROR', {
      details: { email: ['required'] },
    });
    const out = Api.fromError(err, makeRes() as never);
    expect(out.toJSON()).toMatchObject({
      error: { details: { email: ['required'] } },
    });
  });

  it('omits details when undefined', () => {
    const err = new AppError('x', 400, 'X');
    const out = Api.fromError(err, makeRes() as never);
    const body = out.toJSON() as unknown as { error: Record<string, unknown> };
    expect('details' in body.error).toBe(false);
  });

  it('uses the custom name when options.name is provided', () => {
    const err = new AppError('x', 400, 'X', { name: 'UserNotFoundError' });
    const out = Api.fromError(err, makeRes() as never);
    expect(out.toJSON()).toMatchObject({
      error: { name: 'UserNotFoundError' },
    });
  });

  it('returns an opaque 500 for unknown errors', () => {
    const out = Api.fromError(new Error('secret sauce'), makeRes() as never);
    expect(out.statusCode).toBe(500);
    expect(out.toJSON()).toMatchObject({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it('produces STREAM_ERROR when headers were already sent', () => {
    const res = makeRes({ headersSent: true });
    const out = Api.fromError(new Error('late'), res as never);
    expect(out.statusCode).toBe(500);
    expect(out.toJSON()).toMatchObject({
      success: false,
      error: { code: 'STREAM_ERROR' },
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      expect.stringContaining('headers were already sent'),
    );
  });

  it('picks up requestId from res.locals', () => {
    const res = makeRes({ locals: { requestId: 'req-42' } });
    const out = Api.fromError(new Error('x'), res as never);
    expect(out.toJSON().meta.requestId).toBe('req-42');
  });

  it('ignores a non-string requestId on res.locals', () => {
    const res = makeRes({ locals: { requestId: 42 } });
    const out = Api.fromError(new Error('x'), res as never);
    expect(out.toJSON().meta.requestId).toBeUndefined();
  });

  it('works without a Response (no requestId)', () => {
    const out = Api.fromError(new Error('x'));
    expect(out.toJSON().meta.requestId).toBeUndefined();
  });
});

/* --------------------------------- send ---------------------------------- */

describe('InternalApiResponse#send', () => {
  it('writes status + JSON body', () => {
    const res = makeRes();
    Api.ok({ hello: 'world' }).send(res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { hello: 'world' } }),
    );
  });

  it('uses res.end() for 204 (no JSON body)', () => {
    const res = makeRes();
    Api.noContent().send(res as never);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalledTimes(1);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('does nothing when headers were already sent', () => {
    const res = makeRes({ headersSent: true });
    Api.ok({ x: 1 }).send(res as never);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

/* -------------------------------- handler -------------------------------- */

describe('Api.handler', () => {
  const next = vi.fn();

  it('sends an Api response returned by the handler as-is', async () => {
    const res = makeRes();
    const h = Api.handler(async () => Api.created({ id: 1 }));
    h(makeReq(), res as never, next);
    await flushAsync();

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { id: 1 } }),
    );
  });

  it('wraps a raw return value in a 200 envelope', async () => {
    const res = makeRes();
    const h = Api.handler(async () => ({ answer: 42 }));
    h(makeReq(), res as never, next);
    await flushAsync();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { answer: 42 } }));
  });

  it('converts thrown errors via fromError', async () => {
    const res = makeRes();
    const h = Api.handler(async () => {
      throw new AppError('nope', 409, 'NOPE');
    });
    h(makeReq(), res as never, next);
    await flushAsync();

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'NOPE' }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('errors out when the handler returns undefined without sending', async () => {
    const res = makeRes();
    const h = Api.handler(async () => undefined);
    h(makeReq(), res as never, next);
    await flushAsync();

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/test', method: 'GET' }),
      expect.stringContaining('returned undefined'),
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('does nothing when handler already sent headers', async () => {
    const res = makeRes({ headersSent: true });
    const h = Api.handler(async () => ({ ignored: true }));
    h(makeReq(), res as never, next);
    await flushAsync();

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('delegates to next() when throwing after headers sent', async () => {
    const res = makeRes({ headersSent: true });
    const boom = new Error('post-headers');
    const h = Api.handler(async () => {
      throw boom;
    });
    h(makeReq(), res as never, next);
    await flushAsync();

    expect(next).toHaveBeenCalledWith(boom);
    expect(res.json).not.toHaveBeenCalled();
  });
});

/* --------------------------- errorMiddleware ----------------------------- */

describe('Api.errorMiddleware', () => {
  const next = vi.fn();

  it('sends the error envelope when headers are not yet sent', () => {
    const res = makeRes();
    const mw = Api.errorMiddleware();
    mw(new AppError('bad', 400, 'BAD'), makeReq(), res as never, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'BAD' }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next(err) when headers already sent', () => {
    const res = makeRes({ headersSent: true });
    const err = new Error('late');
    const mw = Api.errorMiddleware();
    mw(err, makeReq(), res as never, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
  });
});
