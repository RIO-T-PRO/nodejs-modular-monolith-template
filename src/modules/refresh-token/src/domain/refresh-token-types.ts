export interface RefreshToken {
  readonly userId: string;
  readonly id: string;
  readonly token: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}

export interface SaveRefreshTokenInput {
  userId: string;
  token: string;
}
