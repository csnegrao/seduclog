const express = require('express');
const router = express.Router();
const { getDelivery, updateDelivery } = require('../store');

/**
 * GET /api/requests/:id/tracking
 * Returns current driver position, ETA, and order status for a delivery.
 */
router.get('/:id/tracking', (req, res) => {
  const { id } = req.params;
  const delivery = getDelivery(id);
  res.json({
    deliveryOrderId: id,
    status: delivery.status,
    driverLocation: delivery.driverLocation,
    eta: delivery.eta,
    destination: delivery.destination,
    driverId: delivery.driverId,
  });
});

/**
 * PUT /api/requests/:id/tracking
 * Update delivery destination (used when order is created).
 * Body: { destination: { lat, lng } }
 */
router.put('/:id/tracking', (req, res) => {
  const { id } = req.params;
  const { destination } = req.body;
  if (!destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') {
    return res.status(400).json({ error: 'Invalid destination. Provide { lat, lng } as numbers.' });
  }
  const updated = updateDelivery(id, { destination });
  res.json({
    deliveryOrderId: id,
    destination: updated.destination,
  });
});

module.exports = router;
