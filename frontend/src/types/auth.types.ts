export type UserRole = 'ADMIN' | 'WAREHOUSE_OPERATOR' | 'DRIVER' | 'REQUESTER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}
