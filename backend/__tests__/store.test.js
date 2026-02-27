const { getDelivery, updateDelivery, saveSubscription, getSubscription, getAllSubscriptions } = require('../store');

describe('store', () => {
  describe('getDelivery', () => {
    it('creates a new delivery with default values', () => {
      const d = getDelivery('new-order-1');
      expect(d.status).toBe('approved');
      expect(d.driverLocation).toBeNull();
      expect(d.eta).toBeNull();
      expect(d.destination).toBeNull();
      expect(d.driverId).toBeNull();
    });

    it('returns the same object on subsequent calls', () => {
      const d1 = getDelivery('new-order-2');
      const d2 = getDelivery('new-order-2');
      expect(d1).toBe(d2);
    });
  });

  describe('updateDelivery', () => {
    it('updates specific fields', () => {
      const updated = updateDelivery('new-order-3', {
        status: 'dispatched',
        driverLocation: { lat: 10, lng: 20 },
      });
      expect(updated.status).toBe('dispatched');
      expect(updated.driverLocation).toEqual({ lat: 10, lng: 20 });
    });

    it('does not overwrite unspecified fields', () => {
      updateDelivery('new-order-4', { status: 'picking' });
      const updated = updateDelivery('new-order-4', { eta: 5 });
      expect(updated.status).toBe('picking');
      expect(updated.eta).toBe(5);
    });
  });

  describe('subscriptions', () => {
    it('saves and retrieves a subscription', () => {
      const sub = { endpoint: 'https://example.com', keys: { auth: 'a', p256dh: 'b' } };
      saveSubscription('user-10', sub);
      expect(getSubscription('user-10')).toBe(sub);
    });

    it('returns null for unknown user', () => {
      expect(getSubscription('unknown-user')).toBeNull();
    });

    it('getAllSubscriptions returns all non-null subscriptions', () => {
      saveSubscription('user-11', { endpoint: 'https://a.com' });
      saveSubscription('user-12', { endpoint: 'https://b.com' });
      const all = getAllSubscriptions();
      expect(all.some((s) => s.endpoint === 'https://a.com')).toBe(true);
      expect(all.some((s) => s.endpoint === 'https://b.com')).toBe(true);
    });
  });
});
