import type { Request, Response, RequestHandler } from 'express';
import { Api } from '@template/shared';
import type { SignUpUseCase } from '../application/create-user-use-case.js';
import type { TokenIssuerPort } from '../domain/token-issue-port.js';
import type { SignUpDto } from './user-schema.js';

export class UserController {
  constructor(
    private readonly deps: {
      createUserUseCase: SignUpUseCase;
      tokenIssuer: TokenIssuerPort;
    },
  ) {}

  signUp: RequestHandler = Api.handler(async (req: Request, res: Response) => {
    const { email, fullname, password } = req.body as SignUpDto;

    const user = await this.deps.createUserUseCase.execute({
      email,
      fullname,
      passwordRaw: password,
    });

    const tokens = await this.deps.tokenIssuer.generateAndSaveTokens({
      userId: user.user_id,
      email: user.email,
      fullname: user.fullname,
    });

    this.deps.tokenIssuer.attachCookies(res, tokens);

    return Api.created(user);
  });
}
