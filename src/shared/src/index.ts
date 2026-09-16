// Constants
export { HttpStatus, HttpStatusName, type HttpStatusCode } from './constants/http-constants.js';

// Errors
export { AppError, type AppErrorOptions } from './errors/app-error.js';

// Logger
export { logger, type Logger, type LogLevel } from './lib/logger.js';

// Response
export {
  ok,
  fail,
  sendOk,
  sendCreated,
  sendNoContent,
  errorHandler,
  asyncHandler,
  type ApiResponse,
  type ApiErrorBody,
  type ResponseMeta,
} from './utils/response.js';

// Module contract
export type { AppModule, ModuleDependencies } from './lib/app-module-interface.js';

// Container
export { createRootContainer, type SharedCradle } from './lib/container.js';

// Events
export { DomainEventDispatcher, type DomainEvent } from './lib/events/domain-event.js';
export { MessageBroker, type IntegrationEvent } from './lib/events/message-broker.js';
export type { MessageDispatcher } from './lib/events/message-dispatcher-interface.js';
