/**
 * In-memory store for active deliveries.
 *
 * Structure:
 * deliveryStore[deliveryOrderId] = {
 *   status: 'approved' | 'picking' | 'dispatched' | 'arriving' | 'delivered',
 *   driverLocation: { lat: number, lng: number } | null,
 *   eta: number | null,   // estimated minutes to arrival
 *   destination: { lat: number, lng: number } | null,
 *   driverId: string | null,
 * }
 */
const deliveryStore = {};

/**
 * In-memory push subscription store.
 * subscriptionStore[userId] = PushSubscription
 */
const subscriptionStore = {};

function getDelivery(deliveryOrderId) {
  if (!deliveryStore[deliveryOrderId]) {
    deliveryStore[deliveryOrderId] = {
      status: 'approved',
      driverLocation: null,
      eta: null,
      destination: null,
      driverId: null,
    };
  }
  return deliveryStore[deliveryOrderId];
}

function updateDelivery(deliveryOrderId, updates) {
  const delivery = getDelivery(deliveryOrderId);
  Object.assign(delivery, updates);
  return delivery;
}

function saveSubscription(userId, subscription) {
  subscriptionStore[userId] = subscription;
}

function getSubscription(userId) {
  return subscriptionStore[userId] || null;
}

function getAllSubscriptions() {
  return Object.values(subscriptionStore);
}

module.exports = {
  getDelivery,
  updateDelivery,
  saveSubscription,
  getSubscription,
  getAllSubscriptions,
};
