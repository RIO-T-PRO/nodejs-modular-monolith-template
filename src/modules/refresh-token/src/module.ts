/* eslint-disable @typescript-eslint/require-await */
import { asClass } from 'awilix';
import type { AwilixContainer } from 'awilix';
import type { AppModule, LoadedModule, SharedCradle } from '@template/shared';

import { JwtAdapter } from './infrastructure/jwt-adapter.js';
import { PrismaRefreshTokenRepository } from './infrastructure/prisma-refresh-token-repository.js';
import { CookieAdapter } from './infrastructure/cookie-adapter.js';

import { LogoutUseCase } from './application/logout-use-case.js';
import { GenerateTokensUseCase } from './application/generate-token-use-case.js';
import { SetAuthCookiesUseCase } from './application/set-auth-cookies-use-case.js';

import { RefreshController } from './api/refresh-controller.js';
import { createRefreshRoutes } from './api/refresh-routes.js';

const basePath = '/auth';

interface RefreshModuleCradle {
  jwtService: JwtAdapter;
  refreshTokenRepository: PrismaRefreshTokenRepository;
  cookieAdapter: CookieAdapter;

  // Exposing exactly what the module needs internally + what the Facade needs
  logoutUseCase: LogoutUseCase;
  generateTokensUseCase: GenerateTokensUseCase;
  setAuthCookiesUseCase: SetAuthCookiesUseCase;

  refreshController: RefreshController;
}

let moduleCradle: RefreshModuleCradle | undefined;

export const getRefreshModuleCradle = (): RefreshModuleCradle => {
  if (!moduleCradle) {
    throw new Error('refresh module has not been registered yet — check the module load order.');
  }
  return moduleCradle;
};

export const refreshModule: AppModule = {
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

      refreshController: asClass(RefreshController).singleton(),
    });

    moduleCradle = scope.cradle;

    const router = createRefreshRoutes(scope.cradle.refreshController);

    return {
      name: 'refresh',
      basePath,
      router,
      async dispose() {
        await scope.dispose();
        if (moduleCradle === scope.cradle) {
          moduleCradle = undefined;
        }
      },
    };
  },
};
