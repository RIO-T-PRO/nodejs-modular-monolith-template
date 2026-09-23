import type { PrismaClient, RefreshToken as PrismaRefreshToken } from '@template/shared';
import type { RefreshTokenRepositoryPort } from '../domain/refresh-token-repository-port.js';
import type { RefreshToken, SaveRefreshTokenInput } from '../domain/refresh-token-types.js';
import { env } from '@template/shared';

export class PrismaUserRepository implements RefreshTokenRepositoryPort {
  constructor(private readonly deps: { prisma: PrismaClient }) {}

  // The Mapper: Converts the DB shape to the pure Domain shape
  private toDomain(prismaRefreshToken: PrismaRefreshToken): RefreshToken {
    return {
      id: prismaRefreshToken.id,
      token: prismaRefreshToken.token,
      userId: prismaRefreshToken.user_id,
      createdAt: prismaRefreshToken.createdAt,
      expiresAt: prismaRefreshToken.expiresAt,
    };
  }

  async save(input: SaveRefreshTokenInput): Promise<RefreshToken> {
    const prismaToken = await this.deps.prisma.refreshToken.create({
      data: {
        user_id: input.userId,
        token: input.token,
        expiresAt: new Date(Date.now() + env.JWT_REFRESH__SECRET_KEY_EXPIRES_IN * 1000),
      },
    });

    return this.toDomain(prismaToken);
  }

  async revoke(token: string): Promise<RefreshToken | null> {
    const prismaToken = await this.deps.prisma.refreshToken.delete({
      where: { token },
    });

    if (!prismaToken) return null;

    return this.toDomain(prismaToken);
  }

  async findById(id: string): Promise<RefreshToken | null> {
    const prismaToken = await this.deps.prisma.refreshToken.findUnique({
      where: { id },
    });

    if (!prismaToken) return null;

    return this.toDomain(prismaToken);
  }

  async findByUserId(userId: string): Promise<RefreshToken | null> {
    const prismaToken = await this.deps.prisma.refreshToken.findFirst({
      where: { user_id: userId },
    });

    if (!prismaToken) return null;

    return this.toDomain(prismaToken);
  }
}
