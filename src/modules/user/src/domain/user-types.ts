// Pure domain shapes. No Prisma, no Express, no Awilix — this file
// could be copy-pasted into a codebase with none of those and still compile.

// ─── Identity ────────────────────────────────────────────────────────────

export interface User {
  readonly user_id: string;
  readonly email: string;
  readonly fullName: string;
  readonly status: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  fullname: string;
  passwordHash: string;
  salt: string;
}

// ─── Auth (owned by the Identity module, NOT exposed via facade) ─────────

export interface AuthCredential {
  readonly user_id: string;
  readonly passwordHash: string;
  readonly salt: string;
}

// ─── Cross-module DTO (exposed via the facade in index.ts) ───────────────

export interface UserContactDto {
  user_id: string;
  email: string;
  fullName: string;
}
