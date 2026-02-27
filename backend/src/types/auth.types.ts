export type UserRole = 'ADMIN' | 'WAREHOUSE_OPERATOR' | 'DRIVER' | 'REQUESTER';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
