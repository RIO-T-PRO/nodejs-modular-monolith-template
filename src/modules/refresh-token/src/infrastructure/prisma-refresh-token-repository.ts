import type { PrismaClient, RefreshToken as PrismaRefreshToken } from '@template/shared';
import type { RefreshTokenRepositoryPort } from '../domain/refresh-token-repository-port.js';
import type { RefreshToken, SaveRefreshTokenInput } from '../domain/refresh-token-types.js';
import { env } from '@template/shared';

// Fixed the class name to reflect what it actually does
export class PrismaRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(private readonly deps: { prisma: PrismaClient }) {}

  private toDomain(prismaRefreshToken: PrismaRefreshToken): RefreshToken {
    return {
      id: prismaRefreshToken.id,
      token: prismaRefreshToken.token,
      userId: prismaRefreshToken.userId,
      createdAt: prismaRefreshToken.createdAt,
      expiresAt: prismaRefreshToken.expiresAt,
    };
  }

  async save(input: SaveRefreshTokenInput): Promise<RefreshToken> {
    const prismaToken = await this.deps.prisma.refreshToken.create({
      data: {
        userId: input.userId,
        token: input.token,
        expiresAt: new Date(Date.now() + env.JWT_REFRESH__SECRET_KEY_EXPIRES_IN * 1000),
      },
    });

    return this.toDomain(prismaToken);
  }

  async revoke(token: string): Promise<RefreshToken | null> {
    try {
      const prismaToken = await this.deps.prisma.refreshToken.delete({
        where: { token },
      });

      return this.toDomain(prismaToken);
    } catch {
      return null;
    }
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
      where: { userId: userId },
    });

    if (!prismaToken) return null;
    return this.toDomain(prismaToken);
  }
}
