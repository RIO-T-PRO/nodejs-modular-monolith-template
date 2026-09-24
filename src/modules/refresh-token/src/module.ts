/* eslint-disable @typescript-eslint/require-await */
import type { Response } from 'express';
import { asClass, asValue } from 'awilix';
import type { AwilixContainer } from 'awilix';
import type { AppModule, LoadedModule, SharedCradle } from '@template/shared';

import { JwtAdapter } from './infrastructure/jwt-adapter.js';
import { PrismaRefreshTokenRepository } from './infrastructure/prisma-refresh-token-repository.js';
import { CookieAdapter } from './infrastructure/cookie-adapter.js';

import { LogoutUseCase } from './application/logout-use-case.js';
import { GenerateTokensUseCase } from './application/generate-token-use-case.js';
import { SetAuthCookiesUseCase } from './application/set-auth-cookies-use-case.js';
import { RefreshTokenUseCase } from './application/refresh-use-case.js';

import { RefreshController } from './api/refresh-controller.js';
import { createRefreshRoutes } from './api/refresh-routes.js';
import type { UserLookupPort } from './domain/user-lookup-port.js';

import type {
  GenerateTokensInput,
  GenerateTokensOutput,
} from './application/generate-token-use-case.js';

const basePath = '/auth';

interface RefreshModuleCradle {
  jwtService: JwtAdapter;
  refreshTokenRepository: PrismaRefreshTokenRepository;
  cookieAdapter: CookieAdapter;
  logoutUseCase: LogoutUseCase;
  generateTokensUseCase: GenerateTokensUseCase;
  setAuthCookiesUseCase: SetAuthCookiesUseCase;
  refreshTokenUseCase: RefreshTokenUseCase;
  userLookup: UserLookupPort;
  refreshController: RefreshController;
}

export interface RefreshModuleDeps {
  userLookup: UserLookupPort;
}

export interface RefreshFacade {
  generateAndSaveTokens(input: GenerateTokensInput): Promise<GenerateTokensOutput>;
  attachCookies(res: Response, tokens: GenerateTokensOutput): void;
}

export const createRefreshModule = (
  deps: RefreshModuleDeps,
): { module: AppModule; facade: RefreshFacade } => {
  let cradle: RefreshModuleCradle | undefined;
  const get = (): RefreshModuleCradle => {
    if (!cradle) throw new Error('refresh module has not been registered yet.');
    return cradle;
  };

  const facade: RefreshFacade = {
    generateAndSaveTokens: (input) => get().generateTokensUseCase.execute(input),
    attachCookies: (res: Response, tokens) =>
      get().setAuthCookiesUseCase.execute({ res, ...tokens }),
  };

  const module: AppModule = {
    name: 'refresh',
    basePath,

    async register(root: AwilixContainer<SharedCradle>): Promise<LoadedModule> {
      const scope = root.createScope<SharedCradle & RefreshModuleCradle>();

      scope.register({
        jwtService: asClass(JwtAdapter).singleton(),
        refreshTokenRepository: asClass(PrismaRefreshTokenRepository).singleton(),
        cookieAdapter: asClass(CookieAdapter).singleton(),
        logoutUseCase: asClass(LogoutUseCase).singleton(),
        generateTokensUseCase: asClass(GenerateTokensUseCase).singleton(),
        setAuthCookiesUseCase: asClass(SetAuthCookiesUseCase).singleton(),
        userLookup: asValue(deps.userLookup), // injected by the app
        refreshTokenUseCase: asClass(RefreshTokenUseCase).singleton(),
        refreshController: asClass(RefreshController).singleton(),
      });

      const c = scope.cradle;
      cradle = c;

      return {
        name: 'refresh',
        basePath,
        router: createRefreshRoutes(c.refreshController),
        async dispose() {
          await scope.dispose();
          if (cradle === c) cradle = undefined;
        },
      };
    },
  };

  return { module, facade };
};
