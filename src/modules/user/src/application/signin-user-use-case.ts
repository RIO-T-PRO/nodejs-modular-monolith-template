import { AppError } from '@template/shared';
import type { PasswordHasherPort } from '../domain/password-hasher-port.js';
import type { UserRepositoryPort } from '../domain/user-repository-port.js';
import { toSafeUser, type SafeUser } from '../domain/user-types.js';

export interface SignInInput {
  email: string;
  passwordRaw: string;
}

export class SignInUserUseCase {
  constructor(
    private readonly deps: {
      userRepository: UserRepositoryPort;
      passwordHasher: PasswordHasherPort;
    },
  ) {}

  async execute(input: SignInInput): Promise<SafeUser> {
    const user = await this.deps.userRepository.findByEmail(input.email);

    if (!user) throw AppError.unauthorized('Invalid email or password');

    const isPasswordValid = await this.deps.passwordHasher.verify(
      input.passwordRaw,
      user.password,
      user.salt,
    );

    if (!isPasswordValid) throw AppError.unauthorized('Invalid email or password');

    return toSafeUser(user);
  }
}
