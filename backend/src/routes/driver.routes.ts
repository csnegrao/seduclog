import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  getOrders,
  confirmPickup,
  updateLocation,
  reportOccurrence,
  confirmDelivery,
} from '../controllers/driver.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const driverLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many requests, please try again later' },
});

router.use(driverLimiter);
router.use(authenticate);
router.use(authorize('DRIVER'));

router.get('/orders', getOrders);
router.patch('/orders/:id/pickup', upload.single('photo'), confirmPickup);
router.post('/orders/:id/location', updateLocation);
router.post('/orders/:id/occurrence', upload.single('photo'), reportOccurrence);
router.post('/orders/:id/deliver', upload.single('photo'), confirmDelivery);

export default router;
