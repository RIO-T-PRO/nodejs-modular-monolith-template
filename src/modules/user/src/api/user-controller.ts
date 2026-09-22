import type { Request, RequestHandler } from 'express';
import { Api } from '@template/shared';
import type { SignUpUseCase } from '../application/create-user-use-case.js';
import type { SignUpDto } from './user-schema.js';

export class UserController {
  constructor(
    private readonly deps: {
      SignUpUseCase: SignUpUseCase;
    },
  ) {}

  signUp: RequestHandler = Api.handler(async (req: Request) => {
    const { email, fullname, password } = req.body as SignUpDto;

    const user = await this.deps.SignUpUseCase.execute({
      email,
      fullname,
      passwordRaw: password,
    });

    return Api.created(user);
  });
}
