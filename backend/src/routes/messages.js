const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { sendMessageSchema } = require('../schemas/messageSchemas');
const { getMessages, sendMessage } = require('../controllers/messageController');

router.get('/:requestId', authenticate, getMessages);
router.post(
  '/:requestId',
  authenticate,
  authorize('REQUESTER', 'WAREHOUSE_OPERATOR'),
  validate(sendMessageSchema),
  sendMessage,
);

module.exports = router;
