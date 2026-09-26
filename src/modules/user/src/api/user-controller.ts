import type { Request, Response, RequestHandler } from 'express';
import { Api } from '@template/shared';
import type { UserSignUpUseCase } from '../application/create-user-use-case.js';
import type { SignInUserUseCase } from '../application/signin-user-use-case.js';
import type { GetUserByIdUseCase } from '../application/get-user-by-id-use-case.js';
import type { TokenIssuerPort } from '../domain/token-issue-port.js';
import type { GetUserByIdParams, SignInDto, SignUpDto } from './user-schema.js';

export class UserController {
  constructor(
    private readonly deps: {
      userSignInUpUseCase: UserSignUpUseCase;
      signInUserUseCase: SignInUserUseCase;
      getUserByIdUseCase: GetUserByIdUseCase;
      tokenIssuer: TokenIssuerPort;
    },
  ) {}

  signUp: RequestHandler = Api.handler(async (req: Request, res: Response) => {
    const { email, fullName, password } = req.body as SignUpDto;

    const user = await this.deps.userSignInUpUseCase.execute({
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

  signIn: RequestHandler = Api.handler(async (req: Request, res: Response) => {
    const { email, password } = req.body as SignInDto;

    const user = await this.deps.signInUserUseCase.execute({
      email,
      passwordRaw: password,
    });

    const tokens = await this.deps.tokenIssuer.generateAndSaveTokens({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
    });

    this.deps.tokenIssuer.attachCookies(res, tokens);

    return Api.ok(user);
  });

  getUserById: RequestHandler = Api.handler(async (req: Request) => {
    const { id } = req.params as GetUserByIdParams;

    const user = await this.deps.getUserByIdUseCase.execute(id);

    return Api.ok(user);
  });
}
