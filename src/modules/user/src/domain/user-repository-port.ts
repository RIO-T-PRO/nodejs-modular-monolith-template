import type { User, CreateUserInput } from './user-types.js';

// The PORT: a contract the domain/application layer depends on, owned
// by the domain, implemented by infrastructure (Prisma today, anything
// else tomorrow). Dependency Inversion — the arrow points INTO the
// domain, never out of it.
export interface UserRepositoryPort {
  create(input: CreateUserInput): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}
