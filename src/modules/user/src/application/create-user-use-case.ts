import type { DomainEventDispatcher } from '@template/shared';
import { AppError } from '@template/shared';
import type { PasswordHasherPort } from '../domain/password-hasher-port.js';
import type { UserRepositoryPort } from '../domain/user-repository-port.js';
import type { User } from '../domain/user-types.js';
import { UserCreatedEvent } from '../domain/events/user-created-event.js';

export interface SignUpInput {
  email: string;
  fullName: string;
  passwordRaw: string;
}

export class UserSignUpUseCase {
  constructor(
    private readonly deps: {
      userRepository: UserRepositoryPort;
      passwordHasher: PasswordHasherPort;
      domainEventDispatcher: DomainEventDispatcher;
    },
  ) {}

  async execute(input: SignUpInput): Promise<User> {
    const existingUser = await this.deps.userRepository.findByEmail(input.email);

    if (existingUser) {
      throw AppError.conflict('Email already in use');
    }

    const { hash, salt } = await this.deps.passwordHasher.hash(input.passwordRaw);

    const user = await this.deps.userRepository.create({
      email: input.email,
      fullName: input.fullName,
      passwordHash: hash,
      salt: salt,
    });

    await this.deps.domainEventDispatcher.dispatch(
      UserCreatedEvent({ id: user.id, email: user.email, fullname: user.fullName }),
    );

    return user;
  }
}
