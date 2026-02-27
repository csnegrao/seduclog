import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate';
import { UserRole } from '../types';

/**
 * Middleware factory that checks whether the authenticated user holds one
 * of the allowed roles.  Must be used AFTER the `authenticate` middleware.
 *
 * @example
 *   router.get('/admin', authenticate, authorize('admin'), handler)
 *   router.get('/report', authenticate, authorize('admin', 'manager'), handler)
 */
export function authorize(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
