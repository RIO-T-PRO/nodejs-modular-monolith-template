import type { Request, Response, RequestHandler } from 'express';
import { Api } from '@template/shared';
import type { LogoutUseCase } from '../application/logout-use-case.js';
import type { JwtPort } from '../domain/jwt-port.js';

export class RefreshController {
  constructor(
    private readonly deps: {
      logoutUseCase: LogoutUseCase;
      jwtService: JwtPort;
    },
  ) {}

  logout: RequestHandler = Api.handler(async (req: Request, res: Response) => {
    const refreshToken = this.deps.jwtService.extractRefresh(req);

    await this.deps.logoutUseCase.execute({
      refreshToken,
      res,
    });

    return Api.noContent();
  });
}
