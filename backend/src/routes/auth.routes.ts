import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate';
import { login, refresh, me } from '../controllers/auth.controller';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later' },
});

router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refresh);
router.get('/me', authenticate, me);

export default router;
