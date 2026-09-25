// Pure domain shapes. No Prisma, no Express, no Awilix — this file
// could be copy-pasted into a codebase with none of those and still compile.

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly password: string;
  readonly salt: string;
  readonly status: UserStatus; // Updated from boolean to UserStatus
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  fullName: string;
  passwordHash: string;
  salt: string;
  status?: UserStatus; // Optional: defaults to ACTIVE in Prisma if omitted
}

export interface UserContactDto {
  id: string;
  email: string;
  fullName: string;
}
