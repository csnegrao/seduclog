const express = require('express');
const webpush = require('web-push');
const router = express.Router();
const { saveSubscription, getSubscription } = require('../store');

// Configure VAPID details lazily so tests can work without env vars
function configureVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'mailto:admin@seduclog.com';

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  return true;
}

/**
 * GET /api/notifications/vapid-public-key
 * Returns the VAPID public key for the frontend to use when subscribing.
 */
router.get('/vapid-public-key', (_req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(503).json({ error: 'Push notifications not configured.' });
  }
  res.json({ publicKey });
});

/**
 * POST /api/notifications/subscribe
 * Saves a push subscription for a user.
 * Body: { userId, subscription }
 */
router.post('/subscribe', (req, res) => {
  const { userId, subscription } = req.body;
  if (!userId || !subscription) {
    return res.status(400).json({ error: 'userId and subscription are required.' });
  }
  saveSubscription(userId, subscription);
  res.status(201).json({ message: 'Subscribed successfully.' });
});

/**
 * POST /api/notifications/unsubscribe
 * Removes a push subscription for a user.
 * Body: { userId }
 */
router.post('/unsubscribe', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }
  saveSubscription(userId, null);
  res.json({ message: 'Unsubscribed successfully.' });
});

/**
 * Sends a push notification when delivery status changes.
 * Called internally from socket.js.
 * @param {string} deliveryOrderId
 * @param {string} status
 */
async function sendStatusNotification(deliveryOrderId, status) {
  if (!configureVapid()) return;

  const statusMessages = {
    approved: 'Sua entrega foi aprovada!',
    picking: 'O motorista está buscando sua encomenda.',
    dispatched: 'Sua encomenda está a caminho!',
    arriving: 'O motorista está chegando!',
    delivered: 'Sua encomenda foi entregue!',
  };

  const message = statusMessages[status] || `Status atualizado: ${status}`;

  const payload = JSON.stringify({
    title: 'SeducLog — Atualização de Entrega',
    body: message,
    data: { deliveryOrderId, status },
  });

  // Send to all subscriptions that have this delivery
  // In production this would be filtered per requester
  const { getAllSubscriptions } = require('../store');
  const subscriptions = getAllSubscriptions().filter(Boolean);

  await Promise.allSettled(
    subscriptions.map((sub) => webpush.sendNotification(sub, payload))
  );
}

module.exports = router;
module.exports.sendStatusNotification = sendStatusNotification;
