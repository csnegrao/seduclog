import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { listUsers, getUser, createUser, updateUser } from '../controllers/users.controller';

const router = Router();
router.use(authenticate);
router.get('/', listUsers);
router.get('/:id', getUser);
router.post('/', authorize('ADMIN'), createUser);
router.put('/:id', authorize('ADMIN'), updateUser);

export default router;
