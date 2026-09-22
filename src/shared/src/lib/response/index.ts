import {
  created,
  errorMiddleware,
  fail,
  fromError,
  handler,
  noContent,
  ok,
} from './api-response.js';

export { buildMeta, type Envelope, type ApiErrorBody, type ResponseMeta } from './envelope.js';
export { requestIdOf } from './requested-id.js';

export const Api = {
  ok,
  created,
  noContent,
  fail,
  fromError,
  handler,
  errorMiddleware,
};
