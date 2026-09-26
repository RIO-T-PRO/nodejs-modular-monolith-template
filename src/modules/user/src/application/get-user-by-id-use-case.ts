import { AppError } from '@template/shared';
import type { UserRepositoryPort } from '../domain/user-repository-port.js';
import { toSafeUser, type SafeUser } from '../domain/user-types.js';

export class GetUserByIdUseCase {
  constructor(
    private dps: {
      userRepository: UserRepositoryPort;
    },
  ) {}

  async execute(id: string): Promise<SafeUser> {
    const user = await this.dps.userRepository.findById(id);

    if (!user) throw AppError.notFound('User not found');

    return toSafeUser(user);
  }
}
