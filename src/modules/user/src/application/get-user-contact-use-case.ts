import type { UserRepositoryPort } from '../domain/user-repository-port.js';
import type { UserContactDto } from '../domain/user-types.js';

export class GetUserContactUseCase {
  constructor(private readonly deps: { userRepository: UserRepositoryPort }) {}

  async execute(userId: string): Promise<UserContactDto | null> {
    const user = await this.deps.userRepository.findById(userId);
    return user ? { user_id: user.user_id, email: user.email, fullname: user.fullname } : null;
  }
}
