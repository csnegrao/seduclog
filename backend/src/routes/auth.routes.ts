import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, refresh, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { loginSchema, refreshSchema } from '../schemas/auth.schemas';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

const router = Router();

/** POST /api/auth/login */
router.post('/login', authLimiter, validate(loginSchema), login);

/** POST /api/auth/refresh */
router.post('/refresh', authLimiter, validate(refreshSchema), refresh);

/** GET /api/auth/me — requires valid access token */
router.get('/me', authLimiter, authenticate, me);
import { login, logout, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

export default router;
