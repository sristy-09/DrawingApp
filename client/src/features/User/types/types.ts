export interface Board {
  _id: string;
  title: string;
  description: string;
  isPublic: boolean;
  thumbnail?: string;
  owner?: { username?: string; email?: string };
  createdAt: string;
  updatedAt: string;
}