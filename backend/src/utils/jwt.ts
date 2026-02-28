import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types';

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'seduclog_access_secret_change_in_production';
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'seduclog_refresh_secret_change_in_production';
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

export function generateAccessToken(
  userId: string,
  email: string,
  role: UserRole,
): string {
  const payload: Omit<JwtPayload, 'type'> & { type: 'access' } = {
    userId,
    email,
    role,
    type: 'access',
  };
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN } as jwt.SignOptions);
}

export function generateRefreshToken(
  userId: string,
  email: string,
  role: UserRole,
): string {
  const payload: Omit<JwtPayload, 'type'> & { type: 'refresh' } = {
    userId,
    email,
    role,
    type: 'refresh',
  };
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
