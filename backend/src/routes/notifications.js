const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { listNotifications, markAllRead } = require('../controllers/notificationController');

router.get('/', authenticate, listNotifications);
router.patch('/read-all', authenticate, markAllRead);

module.exports = router;
