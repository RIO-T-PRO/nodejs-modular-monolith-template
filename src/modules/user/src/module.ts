/* eslint-disable @typescript-eslint/require-await */
import { asClass, asValue } from 'awilix';
import type { AwilixContainer } from 'awilix';
import {
  AppError,
  DomainEventDispatcher,
  type AppModule,
  type LoadedModule,
  type SharedCradle,
} from '@template/shared';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository.js';
import { Pbkdf2PasswordHasher } from './infrastructure/pbkdf2-password-hasher.js';
import { UserIntegrationEventPublisher } from './infrastructure/integration-event-publisher.js';

import { UserSignUpUseCase } from './application/create-user-use-case.js';
import { GetUserContactUseCase } from './application/get-user-contact-use-case.js';

import { UserController } from './api/user-controller.js';
import { createUserRoutes } from './api/user-routes.js';

import type { TokenIssuerPort } from './domain/token-issue-port.js';
import type { UserRepositoryPort } from './domain/user-repository-port.js';
import type { PasswordHasherPort } from './domain/password-hasher-port.js';
import type { UserContactDto } from './domain/user-types.js';

const basePath = '/users';

interface UsersModuleCradle {
  domainEventDispatcher: DomainEventDispatcher;
  userRepository: UserRepositoryPort;
  passwordHasher: PasswordHasherPort;
  createUserUseCase: UserSignUpUseCase;
  getUserContactUseCase: GetUserContactUseCase;
  tokenIssuer: TokenIssuerPort;
  userController: UserController;
}

export interface UsersModuleDeps {
  tokenIssuer: TokenIssuerPort;
}

export interface UsersFacade {
  findById(userId: string): Promise<UserContactDto | null>;
}

export const createUsersModule = (
  deps: UsersModuleDeps,
): { module: AppModule; facade: UsersFacade } => {
  // Private to this factory: no exported global getter.
  let cradle: UsersModuleCradle | undefined;

  const facade: UsersFacade = {
    findById: (id) => {
      if (!cradle) throw AppError.badRequest('users module has not been registered yet.');
      return cradle.getUserContactUseCase.execute(id);
    },
  };

  const module: AppModule = {
    name: 'users',
    basePath,

    async register(root: AwilixContainer<SharedCradle>): Promise<LoadedModule> {
      const scope = root.createScope<SharedCradle & UsersModuleCradle>();

      scope.register({
        domainEventDispatcher: asClass(DomainEventDispatcher).singleton(),
        userRepository: asClass(PrismaUserRepository).singleton(),
        passwordHasher: asClass(Pbkdf2PasswordHasher).singleton(),
        createUserUseCase: asClass(UserSignUpUseCase).singleton(),
        getUserContactUseCase: asClass(GetUserContactUseCase).singleton(),
        tokenIssuer: asValue(deps.tokenIssuer), // injected by the app
        userController: asClass(UserController).singleton(),
      });

      const c = scope.cradle;
      cradle = c;

      const publisher = new UserIntegrationEventPublisher({ messageBroker: c.messageBroker });
      const unwire = publisher.wire(c.domainEventDispatcher);

      return {
        name: 'users',
        basePath,
        router: createUserRoutes(c.userController),
        async dispose() {
          unwire();
          await scope.dispose();
          if (cradle === c) cradle = undefined;
        },
      };
    },
  };

  return { module, facade };
};
