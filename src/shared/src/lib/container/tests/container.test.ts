import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ------------------------------- Mocks ---------------------------------- */

const mocks = vi.hoisted(() => ({
  env: {
    NODE_ENV: 'test',
    MESSAGE_DISPATCHER: 'memory',
    DATABASE_URL: 'postgres://test',
    REDIS_URL: undefined as string | undefined,
  },
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
  brokerDispose: vi.fn(),
  brokerInstances: [] as Array<{ dispatcher: unknown; logger: unknown }>,
  dispatcherInstances: [] as Array<{ kind: 'memory' | 'redis'; args: unknown[] }>,
  createPrismaClientArgs: [] as unknown[],
  loggerRef: {},
}));

vi.mock('#config/env', () => ({ env: mocks.env }));

vi.mock('../../logger/logger.js', () => {
  mocks.loggerRef = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };
  return { logger: mocks.loggerRef };
});

vi.mock('../../db/prisma.js', () => ({
  default: (config: unknown) => {
    mocks.createPrismaClientArgs.push(config);
    return mocks.prisma;
  },
}));

vi.mock('../../events/message-broker.js', () => ({
  MessageBroker: class {
    dispose = mocks.brokerDispose;
    constructor(
      public dispatcher: unknown,
      public logger: unknown,
    ) {
      mocks.brokerInstances.push({ dispatcher, logger });
    }
  },
}));

vi.mock('../../events/memory-message-dispatcher.js', () => ({
  MemoryMessageDispatcher: class {
    constructor(...args: unknown[]) {
      mocks.dispatcherInstances.push({ kind: 'memory', args });
    }
    publish = vi.fn();
    subscribe = vi.fn();
    dispose = vi.fn();
  },
}));

vi.mock('../../events/redis-message-dispatcher.js', () => ({
  RedisMessageDispatcher: class {
    constructor(...args: unknown[]) {
      mocks.dispatcherInstances.push({ kind: 'redis', args });
    }
    publish = vi.fn();
    subscribe = vi.fn();
    dispose = vi.fn();
  },
}));

/* ------------------------------- Imports -------------------------------- */

import { createRootContainer } from '../container.js';

/* ------------------------------- Reset ---------------------------------- */

beforeEach(() => {
  mocks.prisma.$connect.mockReset().mockResolvedValue(undefined);
  mocks.prisma.$disconnect.mockReset().mockResolvedValue(undefined);
  mocks.brokerDispose.mockReset().mockResolvedValue(undefined);
  mocks.brokerInstances.length = 0;
  mocks.dispatcherInstances.length = 0;
  mocks.createPrismaClientArgs.length = 0;
  mocks.env.NODE_ENV = 'test';
  mocks.env.MESSAGE_DISPATCHER = 'memory';
  mocks.env.DATABASE_URL = 'postgres://test';
  mocks.env.REDIS_URL = undefined;
});

/* -------------------------------- Tests --------------------------------- */

describe('createRootContainer', () => {
  it('returns a container and a resources object', async () => {
    const { container, resources } = await createRootContainer();
    expect(typeof container.register).toBe('function');
    expect(typeof container.resolve).toBe('function');
    expect(typeof resources.dispose).toBe('function');
  });

  it('passes env to createPrismaClient', async () => {
    await createRootContainer();
    expect(mocks.createPrismaClientArgs).toEqual([mocks.env]);
  });

  it('connects prisma before returning', async () => {
    await createRootContainer();
    expect(mocks.prisma.$connect).toHaveBeenCalledTimes(1);
  });

  it('registers env, logger, prisma, and messageBroker on the cradle', async () => {
    const { container } = await createRootContainer();

    expect(container.cradle.env).toBe(mocks.env);
    expect(container.cradle.prisma).toBe(mocks.prisma);
    expect(container.cradle.logger).toBe(mocks.loggerRef);
    expect(container.cradle.messageBroker).toBeDefined();
  });

  it('wires MessageBroker with a dispatcher and the logger', async () => {
    await createRootContainer();

    expect(mocks.brokerInstances).toHaveLength(1);
    const { logger } = mocks.brokerInstances[0]!;
    expect(logger).toBe(mocks.loggerRef);
  });

  /* --------------------------- dispatcher selection --------------------- */

  describe('dispatcher selection', () => {
    it('uses MemoryMessageDispatcher by default', async () => {
      await createRootContainer();
      expect(mocks.dispatcherInstances).toHaveLength(1);
      expect(mocks.dispatcherInstances[0]!.kind).toBe('memory');
    });

    it('uses RedisMessageDispatcher when MESSAGE_DISPATCHER=redis', async () => {
      mocks.env.MESSAGE_DISPATCHER = 'redis';
      mocks.env.REDIS_URL = 'redis://localhost:6379';

      await createRootContainer();

      expect(mocks.dispatcherInstances).toHaveLength(1);
      const inst = mocks.dispatcherInstances[0]!;
      expect(inst.kind).toBe('redis');
      expect(inst.args[0]).toBe('redis://localhost:6379');
      expect(inst.args[1]).toBe(mocks.loggerRef);
    });

    it('throws when MESSAGE_DISPATCHER=redis without REDIS_URL', async () => {
      mocks.env.MESSAGE_DISPATCHER = 'redis';
      mocks.env.REDIS_URL = undefined;

      await expect(createRootContainer()).rejects.toThrow(
        'REDIS_URL is required when MESSAGE_DISPATCHER=redis',
      );
    });

    it('treats any non-"redis" value as memory', async () => {
      mocks.env.MESSAGE_DISPATCHER = 'memory';
      await createRootContainer();
      expect(mocks.dispatcherInstances[0]!.kind).toBe('memory');
    });
  });

  /* ---------------------------- resources.dispose ----------------------- */

  describe('resources.dispose', () => {
    it('disconnects prisma and disposes the broker', async () => {
      const { resources } = await createRootContainer();
      await resources.dispose();

      expect(mocks.prisma.$disconnect).toHaveBeenCalledTimes(1);
      expect(mocks.brokerDispose).toHaveBeenCalledTimes(1);
    });

    it('resolves even if prisma disconnect rejects (allSettled)', async () => {
      mocks.prisma.$disconnect.mockRejectedValueOnce(new Error('db gone'));
      const { resources } = await createRootContainer();

      await expect(resources.dispose()).resolves.toBeUndefined();
      expect(mocks.brokerDispose).toHaveBeenCalledTimes(1);
    });

    it('resolves even if broker dispose rejects (allSettled)', async () => {
      mocks.brokerDispose.mockRejectedValueOnce(new Error('broker gone'));
      const { resources } = await createRootContainer();

      await expect(resources.dispose()).resolves.toBeUndefined();
      expect(mocks.prisma.$disconnect).toHaveBeenCalledTimes(1);
    });

    it('attempts both resources when either fails', async () => {
      mocks.prisma.$disconnect.mockRejectedValueOnce(new Error('boom'));
      mocks.brokerDispose.mockRejectedValueOnce(new Error('boom'));
      const { resources } = await createRootContainer();

      await resources.dispose();

      expect(mocks.prisma.$disconnect).toHaveBeenCalledTimes(1);
      expect(mocks.brokerDispose).toHaveBeenCalledTimes(1);
    });
  });
});
