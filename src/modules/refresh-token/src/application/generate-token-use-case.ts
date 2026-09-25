import type { JwtPort } from '../domain/jwt-port.js';
import type { RefreshTokenRepositoryPort } from '../domain/refresh-token-repository-port.js';

export interface GenerateTokensInput {
  userId: string;
  email: string;
  fullName: string;
}

export interface GenerateTokensOutput {
  accessToken: string;
  refreshToken: string;
}

export class GenerateTokensUseCase {
  constructor(
    private readonly deps: {
      jwtService: JwtPort;
      refreshTokenRepository: RefreshTokenRepositoryPort;
    },
  ) {}

  async execute(input: GenerateTokensInput): Promise<GenerateTokensOutput> {
    const accessToken = this.deps.jwtService.signAccess({
      userId: input.userId,
      email: input.email,
      fullName: input.fullName,
    });

    const refreshToken = this.deps.jwtService.signRefresh({
      userId: input.userId,
    });

    await this.deps.refreshTokenRepository.save({
      userId: input.userId,
      token: refreshToken,
    });

    return { accessToken, refreshToken };
  }
}
