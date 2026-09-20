import type { Router } from 'express';
import type { AwilixContainer } from 'awilix';
import type { SharedCradle } from './shared-cradle-interface.js';

/**
 * What a module returns after registering. The shell uses `router` to mount
 * HTTP and `dispose` to tear down the module's scoped container and any
 * integration-event subscriptions it opened.
 */
export interface LoadedModule {
  readonly name: string;
  readonly basePath: string;
  readonly router: Router;
  dispose(): Promise<void>;
}

/**
 * Contract every module implements.
 *
 * A module receives the root container and must:
 *   1. Create its OWN scope (root.createScope<ModuleCradle>()).
 *   2. Register its repositories/services into that scope.
 *   3. Subscribe to integration events it cares about.
 *   4. Return a router and a dispose function.
 *
 * Modules NEVER resolve each other's services from the root container.
 */
export interface AppModule {
  readonly name: string;
  readonly basePath: string;
  /** Names of modules that must be registered before this one. */
  readonly dependsOn?: readonly string[];
  register(root: AwilixContainer<SharedCradle>): Promise<LoadedModule>;
}
