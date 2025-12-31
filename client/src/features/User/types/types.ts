export interface UserRef {
  _id: string;
  username?: string;
  email?: string;
  avatar?: string;
}

export interface Board {
  _id: string;
  title: string;
  description: string;
  isPublic: boolean;
  thumbnail?: string;
  owner?: UserRef;
  collaborators?: {
    user: UserRef;
  }[];
  createdAt: string;
  updatedAt: string;
}
