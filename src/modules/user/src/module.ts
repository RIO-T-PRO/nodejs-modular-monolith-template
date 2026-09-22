/* eslint-disable @typescript-eslint/require-await */
import { asClass } from 'awilix';
import type { AwilixContainer } from 'awilix';
import {
  DomainEventDispatcher,
  type AppModule,
  type LoadedModule,
  type SharedCradle,
} from '@template/shared';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository.js';
import { UserIntegrationEventPublisher } from './infrastructure/integration-event-publisher.js';
import { SignUpUseCase } from './application/create-user-use-case.js';
import { UserController } from './api/user-controller.js';
import { createUserRoutes } from './api/user-routes.js';

const basePath = '/users';

// Everything this module registers into its OWN Awilix scope. Kept
// private to this file — nothing outside module.ts/index.ts should
// need to know these keys exist.
//
// NOTE: keys must match exactly what register() puts on the scope.
// The controller injects by key name in PROXY mode, so a mismatch
// here is a silent `undefined` at construction time.
interface UsersModuleCradle {
  domainEventDispatcher: DomainEventDispatcher;
  userRepository: PrismaUserRepository;
  createUserUseCase: SignUpUseCase;
  userController: UserController;
}

// Set once, when register() runs. Cleared again in dispose() so that
// a second registration (e.g. across integration tests) doesn't leave
// the facade pointing at a dead scope.
let moduleCradle: UsersModuleCradle | undefined;

export const getUsersModuleCradle = (): UsersModuleCradle => {
  if (!moduleCradle) {
    throw new Error('users module has not been registered yet — check the module load order.');
  }
  return moduleCradle;
};

// THE ONLY FILE in this module allowed to import from every layer.
// Its single responsibility is wiring domain ports to infrastructure
// implementations and infrastructure controllers to application use
// cases — nothing here contains business logic itself.
export const usersModule: AppModule = {
  name: 'users',
  basePath,

  async register(root: AwilixContainer<SharedCradle>): Promise<LoadedModule> {
    // A SCOPE, not a new container: this module still sees the root's
    // env/logger/prisma/messageBroker, but its OWN registrations can't
    // collide with another module's.
    const scope = root.createScope<SharedCradle & UsersModuleCradle>();

    scope.register({
      domainEventDispatcher: asClass(DomainEventDispatcher).singleton(),
      userRepository: asClass(PrismaUserRepository).singleton(),
      createUserUseCase: asClass(SignUpUseCase).singleton(),
      userController: asClass(UserController).singleton(),
    });

    moduleCradle = scope.cradle;

    // Wire the domain-event -> integration-event bridge. This is the
    // one place in the whole module that knows both worlds exist.
    // `wire()` is expected to return an unsubscribe function so that
    // dispose() can tear the subscription down again.
    const publisher = new UserIntegrationEventPublisher({
      messageBroker: scope.cradle.messageBroker,
    });

    const unwire = publisher.wire(scope.cradle.domainEventDispatcher);

    // Build the router here and hand it back to the shell — the shell
    // owns mounting, so we don't touch `app` at all.
    const router = createUserRoutes(scope.cradle.userController);

    return {
      name: 'users',
      basePath,
      router,
      async dispose() {
        // 1. Stop forwarding domain events to the broker.
        unwire();
        // 2. Tear down this module's scope (runs any disposers
        //    registered via `.disposable()` on our own classes).
        await scope.dispose();
        // 3. Drop the facade reference if it's still ours.
        if (moduleCradle === scope.cradle) {
          moduleCradle = undefined;
        }
      },
    };
  },
};
