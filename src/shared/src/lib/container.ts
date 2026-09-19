import { createContainer as createAwilixContainer, asValue, InjectionMode } from 'awilix';
import type { AwilixContainer } from 'awilix';
import type { PrismaClient } from '../generated/prisma/client.js';
import { env, type Env } from '#config/env';
import { logger, type Logger } from './logger.js';
import createPrismaClient from './prisma.js';
import { MessageBroker } from './events/message-broker.js';
import { MemoryMessageDispatcher } from './events/memory-message-dispatcher.js';
import { RedisMessageDispatcher } from './events/redis-message-dispatcher.js';
import type { MessageDispatcher } from './events/message-dispatcher-interface.js';

export interface SharedCradle {
  env: Env;
  logger: Logger;
  prisma: PrismaClient;
  messageBroker: MessageBroker;
}

/**
 * Resources the app shell must close on shutdown. Returned alongside the
 * container so lifecycle stays explicit — the container handles wiring,
 * the shell handles teardown.
 */
export interface RootResources {
  dispose(): Promise<void>;
}

const createDispatcher = (config: Env): MessageDispatcher => {
  if (config.MESSAGE_DISPATCHER === 'redis') {
    if (!config.REDIS_URL) {
      throw new Error('REDIS_URL is required when MESSAGE_DISPATCHER=redis');
    }
    return new RedisMessageDispatcher(config.REDIS_URL, logger);
  }
  return new MemoryMessageDispatcher();
};

export async function createRootContainer(): Promise<{
  container: AwilixContainer<SharedCradle>;
  resources: RootResources;
}> {
  const container = createAwilixContainer<SharedCradle>({
    injectionMode: InjectionMode.PROXY,
  });

  const prisma = createPrismaClient(env);
  await prisma.$connect();

  const messageBroker = new MessageBroker(createDispatcher(env), logger);

  container.register({
    env: asValue(env),
    logger: asValue(logger),
    prisma: asValue(prisma),
    messageBroker: asValue(messageBroker),
  });

  const resources: RootResources = {
    async dispose() {
      // allSettled: a slow/failed close on one resource must not block the other.
      await Promise.allSettled([prisma.$disconnect(), messageBroker.dispose()]);
    },
  };

  return { container, resources };
}
