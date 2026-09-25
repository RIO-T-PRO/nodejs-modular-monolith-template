import type { Request, Response, RequestHandler } from 'express';
import { Api } from '@template/shared';
import type { UserSignUpUseCase } from '../application/create-user-use-case.js';
// import type
import type { TokenIssuerPort } from '../domain/token-issue-port.js';
import type { SignUpDto } from './user-schema.js';

export class UserController {
  constructor(
    private readonly deps: {
      createUserUseCase: UserSignUpUseCase;
      tokenIssuer: TokenIssuerPort;
    },
  ) {}

  signUp: RequestHandler = Api.handler(async (req: Request, res: Response) => {
    const { email, fullName, password } = req.body as SignUpDto;

    const user = await this.deps.createUserUseCase.execute({
      email,
      fullName,
      passwordRaw: password,
    });

    const tokens = await this.deps.tokenIssuer.generateAndSaveTokens({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
    });

    this.deps.tokenIssuer.attachCookies(res, tokens);

    return Api.created(user);
  });
}
