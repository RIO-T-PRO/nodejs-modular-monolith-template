import type { AppModule } from '@template/shared';
import { createUsersModule } from '@template/users-module';
import { createRefreshModule } from '@template/refresh-token-module';

/**
 * Composition root: the ONLY place that knows about more than one module.
 * Modules never import each other; they declare the ports they need and
 * this file plugs one module's facade into another's dependency.
 *
 * HOW TO ADD A NEW MODULE
 * 1. Give the module a factory: `createXModule(deps)` returning
 *    `{ module, facade }`. `deps` are the ports it needs from other modules.
 * 2. Construct it here:
 *      - no dependencies:      `const notes = createNotesModule();`
 *      - depends on a module:  `const orders = createOrdersModule({ userLookup: users.facade });`
 *      - circular dependency:  wrap the other facade in a closure so it only
 *        runs at request time (see `refresh` -> `users` below).
 * 3. Add `x.module` to the returned array. Array order only affects
 *    registration and route mounting, not wiring.
 * 4. Pass facades, never modules, between modules, and keep logic out of
 *    this file. Fire-and-forget interactions belong on domain events,
 *    not facades.
 */
export const buildModules = (): AppModule[] => {
  // `users` is referenced inside a closure, so it only runs at request time,
  // after both modules are registered.
  const refresh = createRefreshModule({
    userLookup: { findById: (id) => users.facade.findById(id) },
  });

  const users = createUsersModule({
    tokenIssuer: refresh.facade, // RefreshFacade structurally satisfies TokenIssuerPort
  });

  return [users.module, refresh.module];
};
