import type { PrismaClient, User as PrismaUser } from '@template/shared';
import type { UserRepositoryPort } from '../domain/user-repository-port.js';
import type { User, CreateUserInput } from '../domain/user-types.js';

export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly deps: { prisma: PrismaClient }) {}

  // The Mapper: Converts the DB shape to the pure Domain shape
  private toDomain(prismaUser: PrismaUser): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      fullName: prismaUser.fullName,
      password: prismaUser.password,
      salt: prismaUser.salt,
      status: prismaUser.status,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }

  async create(input: CreateUserInput): Promise<User> {
    const prismaUser = await this.deps.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        password: input.passwordHash,
        salt: input.salt,
        ...(input.status && { status: input.status }),
      },
    });

    return this.toDomain(prismaUser);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.deps.prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    return this.toDomain(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.deps.prisma.user.findUnique({
      where: { email },
    });

    if (!user) return null;

    return this.toDomain(user);
  }
}
