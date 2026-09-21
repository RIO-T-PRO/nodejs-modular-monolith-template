import type { Env } from '#config/env';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { MessageBroker } from '../../events/message-broker.js';
import type { Logger } from '../../logger/interfaces/logger-interface.js';

export interface SharedCradle {
  env: Env;
  logger: Logger;
  prisma: PrismaClient;
  messageBroker: MessageBroker;
}
