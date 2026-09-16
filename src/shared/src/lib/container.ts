import { createContainer as createAwilixContainer, asValue, InjectionMode } from 'awilix';
import type { AwilixContainer } from 'awilix';
import type { PrismaClient } from '../generated/prisma/client.js';
import { env } from '#config/env';
import { logger, type Logger } from './logger.js';
import createPrismaClient from './prisma.js';
import { MessageBroker } from './events/message-broker.js';
import { MemoryMessageDispatcher } from './events/memory-message-dispatcher.js';
import { RedisMessageDispatcher } from './events/redis-message-dispatcher.js';

// Every dependency any module might need from the shared kernel.
// Modules register their OWN services into this SAME container under
// their own keys — they never construct a container of their own.
//
// Note: DomainEventDispatcher is deliberately NOT registered here.
// Domain events never leave the module that raised them, so each
// module constructs (and injects) its own dispatcher instance in its
// register() function — sharing one instance across modules here would
// silently let module A's handlers hear module B's domain events.

export interface SharedCradle {
  env: typeof env;
  logger: Logger;
  prisma: PrismaClient;
  messageBroker: MessageBroker;
}

export const createRootContainer = (): AwilixContainer<SharedCradle> => {
  const container = createAwilixContainer<SharedCradle>({
    injectionMode: InjectionMode.PROXY,
  });

  const dispatcher =
    env.MESSAGE_DISPATCHER === 'redis'
      ? new RedisMessageDispatcher(env.REDIS_URL)
      : new MemoryMessageDispatcher();

  container.register({
    env: asValue(env),
    logger: asValue(logger),
    prisma: asValue(createPrismaClient()),
    messageBroker: asValue(new MessageBroker(dispatcher)),
  });

  return container;
};
