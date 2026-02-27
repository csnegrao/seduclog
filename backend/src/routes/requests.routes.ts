import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { listRequests, getRequest, createRequest, updateRequestStatus } from '../controllers/requests.controller';

const router = Router();
router.use(authenticate);
router.get('/', listRequests);
router.get('/:id', getRequest);
router.post('/', authorize('REQUESTER', 'ADMIN'), createRequest);
router.patch('/:id/status', authorize('ADMIN', 'WAREHOUSE_OPERATOR', 'MANAGER'), updateRequestStatus);

export default router;
