import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, refresh, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

const router = Router();

/** POST /api/auth/login */
router.post('/login', authLimiter, login);

/** POST /api/auth/refresh */
router.post('/refresh', authLimiter, refresh);

/** GET /api/auth/me — requires valid access token */
router.get('/me', authLimiter, authenticate, me);

export default router;
