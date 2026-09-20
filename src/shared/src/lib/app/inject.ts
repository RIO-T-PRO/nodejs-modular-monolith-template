import type { SharedCradle } from './interfaces/shared-cradle-interface.js';

export type Inject<K extends keyof SharedCradle> = Pick<SharedCradle, K>;
