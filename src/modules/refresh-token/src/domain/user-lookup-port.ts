export interface UserContact {
  id: string;
  email: string;
  fullName: string;
}

export interface UserLookupPort {
  findById(userId: string): Promise<UserContact | null>;
}
