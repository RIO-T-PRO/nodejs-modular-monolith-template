import type { Request, Response, RequestHandler } from 'express';
import { Api } from '@template/shared';
import type { RefreshTokenUseCase } from '../application/refresh-use-case.js';
import type { LogoutUseCase } from '../application/logout-use-case.js';
import type { JwtPort } from '../domain/jwt-port.js';

export class RefreshController {
  constructor(
    private readonly deps: {
      logoutUseCase: LogoutUseCase;
      refreshTokenUseCase: RefreshTokenUseCase;
      jwtService: JwtPort;
    },
  ) {}

  refresh: RequestHandler = Api.handler(async (req: Request, res: Response) => {
    const refreshToken = this.deps.jwtService.extractRefresh(req);

    const tokens = await this.deps.refreshTokenUseCase.execute({
      refreshToken,
      res,
    });

    return Api.ok(tokens);
  });

  logout: RequestHandler = Api.handler(async (req: Request, res: Response) => {
    const refreshToken = this.deps.jwtService.extractRefresh(req);

    await this.deps.logoutUseCase.execute({
      refreshToken,
      res,
    });

    return Api.noContent();
  });
}
