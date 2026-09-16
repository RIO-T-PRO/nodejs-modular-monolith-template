import type { Express } from 'express';
import type { AwilixContainer } from 'awilix';
import type { SharedCradle } from './container.js';

export interface ModuleDependencies {
  container: AwilixContainer<SharedCradle>;
}

// The contract every module must implement to be loaded by the app shell.
// This is the ENTIRE surface the shell knows about — it never reaches
// into a module's domain/application/infrastructure layers directly.

export interface AppModule {
  /** Unique, human-readable module name (used in logs). */
  readonly name: string;
  /** Express path prefix this module's routes are mounted under. */
  readonly basePath: string;
  /**
   * Called once at boot. Register the module's own DI registrations
   * (repositories, services) into a scoped container, mount its Express
   * router, and subscribe to any integration events it cares about.
   */
  register(app: Express, deps: ModuleDependencies): void | Promise<void>;
}
