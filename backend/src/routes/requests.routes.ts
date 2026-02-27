import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  listRequests,
  getRequest,
  createRequest,
  updateRequestStatus,
  deleteRequest,
} from '../controllers/requests.controller';

const router = Router();

router.use(authenticate);
router.get('/', listRequests);
router.get('/:id', getRequest);
router.post('/', authorize('REQUESTER', 'ADMIN'), createRequest);
router.patch('/:id/status', updateRequestStatus);
router.delete('/:id', authorize('ADMIN', 'REQUESTER'), deleteRequest);

export default router;
