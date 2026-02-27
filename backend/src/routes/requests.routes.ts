import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  createRequest,
  listRequests,
  getRequest,
  approveRequest,
  cancelRequest,
  addMessage,
  updateRequestStatus,
} from '../controllers/requests.controller';

const router = Router();

router.use(authenticate);

// List all requests (filtered by query params)
router.get('/', listRequests);

// Get a single request with items and history
router.get('/:id', getRequest);

// Create a new request (REQUESTER only)
router.post('/', authorize('REQUESTER', 'ADMIN'), createRequest);

// Approve a request with quantity adjustments (WAREHOUSE_OPERATOR / ADMIN)
router.patch('/:id/approve', authorize('WAREHOUSE_OPERATOR', 'ADMIN'), approveRequest);

// Cancel a pending request (requester or admin)
router.patch('/:id/cancel', authorize('REQUESTER', 'ADMIN'), cancelRequest);

// Update request status (IN_PROGRESS, IN_TRANSIT, DELIVERED)
router.patch('/:id/status', authorize('ADMIN', 'WAREHOUSE_OPERATOR', 'DRIVER'), updateRequestStatus);

// Message thread
router.post('/:id/messages', addMessage);

export default router;
