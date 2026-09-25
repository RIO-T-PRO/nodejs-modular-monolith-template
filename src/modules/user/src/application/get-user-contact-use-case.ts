import type { UserRepositoryPort } from '../domain/user-repository-port.js';
import type { UserContactDto } from '../domain/user-types.js';

export class GetUserContactUseCase {
  constructor(private readonly deps: { userRepository: UserRepositoryPort }) {}

  async execute(userId: string): Promise<UserContactDto | null> {
    const user = await this.deps.userRepository.findById(userId);
    return user ? { id: user.id, email: user.email, fullName: user.fullName } : null;
  }
}
