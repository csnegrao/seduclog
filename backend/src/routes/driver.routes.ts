import { Router } from 'express';
import multer from 'multer';
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

router.use(authenticate);
router.use(authorize('DRIVER'));

router.get('/orders', getOrders);
router.patch('/orders/:id/pickup', upload.single('photo'), confirmPickup);
router.post('/orders/:id/location', updateLocation);
router.post('/orders/:id/occurrence', upload.single('photo'), reportOccurrence);
router.post('/orders/:id/deliver', upload.single('photo'), confirmDelivery);

export default router;
