import { Request, Response } from 'express';
import {
  findUserByEmail,
  findUserById,
  comparePassword,
} from '../models/user.model';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { LoginRequest, UserPublic } from '../types';

function toPublic(user: ReturnType<typeof findUserById>): UserPublic | null {
  if (!user) return null;
  const { id, name, email, role, createdAt } = user;
  return { id, name, email, role, createdAt };
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { accessToken, refreshToken, user }
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginRequest;

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  const user = findUserByEmail(email);

  if (!user) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);

  if (!valid) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const accessToken = generateAccessToken(user.id, user.email, user.role);
  const refreshToken = generateRefreshToken(user.id, user.email, user.role);

  res.status(200).json({
    accessToken,
    refreshToken,
    user: toPublic(user),
  });
}

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 * Returns: { accessToken, refreshToken }
 */
export function refresh(req: Request, res: Response): void {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    res.status(400).json({ message: 'refreshToken is required' });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);

    if (payload.type !== 'refresh') {
      res.status(401).json({ message: 'Invalid token type' });
      return;
    }

    const newAccessToken = generateAccessToken(
      payload.userId,
      payload.email,
      payload.role,
    );
    const newRefreshToken = generateRefreshToken(
      payload.userId,
      payload.email,
      payload.role,
    );

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
}

/**
 * GET /api/auth/me
 * Requires: Bearer access token
 * Returns: { user }
 */
export function me(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }

  const user = findUserById(req.user.userId);

  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  res.status(200).json({ user: toPublic(user) });
}
