export type UserRole =
  | 'admin'
  | 'manager'
  | 'driver'
  | 'viewer'
  | 'requester'
  | 'warehouse_operator';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextValue {
  /** The currently authenticated user, or null if not authenticated. */
  user: AuthUser | null;
  /** True when the user holds a valid access token. */
  isAuthenticated: boolean;
  /** Authenticate with email and password. Throws on failure. */
  login: (credentials: LoginCredentials) => Promise<void>;
  /** Clear tokens and user state. */
  logout: () => void;
  /** Returns true when the current user has one of the given roles. */
  hasRole: (...roles: UserRole[]) => boolean;
}
