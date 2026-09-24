export interface UserContact {
  user_id: string;
  email: string;
  fullname: string;
}

export interface UserLookupPort {
  findById(userId: string): Promise<UserContact | null>;
}
