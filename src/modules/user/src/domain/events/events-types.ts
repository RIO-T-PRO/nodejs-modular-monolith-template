export interface UserCreatedPayload {
  id: string;
  email: string;
  fullname: string;
}

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface UserUpdatedPayload {
  id: string;
  fullName: string;
  email: string;
  status: UserStatus;
}
