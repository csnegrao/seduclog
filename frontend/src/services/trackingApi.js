const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Fetch tracking data for a delivery order.
 * @param {string} deliveryOrderId
 * @returns {Promise<Object>}
 */
export async function fetchTracking(deliveryOrderId) {
  const res = await fetch(`${BACKEND_URL}/api/requests/${deliveryOrderId}/tracking`);
  if (!res.ok) throw new Error(`Failed to fetch tracking: ${res.status}`);
  return res.json();
}
