const request = require('supertest');
const app = require('../app');
const { updateDelivery } = require('../store');

describe('GET /api/requests/:id/tracking', () => {
  it('returns 200 with default delivery state for a new id', async () => {
    const res = await request(app).get('/api/requests/order-001/tracking');
    expect(res.status).toBe(200);
    expect(res.body.deliveryOrderId).toBe('order-001');
    expect(res.body.status).toBe('approved');
    expect(res.body.driverLocation).toBeNull();
    expect(res.body.eta).toBeNull();
  });

  it('returns updated driver location and eta after update', async () => {
    updateDelivery('order-002', {
      driverLocation: { lat: -8.05, lng: -34.9 },
      eta: 12,
      status: 'dispatched',
    });
    const res = await request(app).get('/api/requests/order-002/tracking');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('dispatched');
    expect(res.body.driverLocation).toEqual({ lat: -8.05, lng: -34.9 });
    expect(res.body.eta).toBe(12);
  });
});

describe('PUT /api/requests/:id/tracking', () => {
  it('sets destination successfully', async () => {
    const res = await request(app)
      .put('/api/requests/order-003/tracking')
      .send({ destination: { lat: -8.06, lng: -34.88 } });
    expect(res.status).toBe(200);
    expect(res.body.destination).toEqual({ lat: -8.06, lng: -34.88 });
  });

  it('returns 400 for invalid destination', async () => {
    const res = await request(app)
      .put('/api/requests/order-004/tracking')
      .send({ destination: { lat: 'bad', lng: -34.88 } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when destination is missing', async () => {
    const res = await request(app)
      .put('/api/requests/order-005/tracking')
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /api/notifications/subscribe', () => {
  it('saves subscription and returns 201', async () => {
    const res = await request(app)
      .post('/api/notifications/subscribe')
      .send({ userId: 'user-1', subscription: { endpoint: 'https://example.com', keys: {} } });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Subscribed successfully.');
  });

  it('returns 400 when userId is missing', async () => {
    const res = await request(app)
      .post('/api/notifications/subscribe')
      .send({ subscription: {} });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/notifications/unsubscribe', () => {
  it('removes subscription and returns 200', async () => {
    const res = await request(app)
      .post('/api/notifications/unsubscribe')
      .send({ userId: 'user-1' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Unsubscribed successfully.');
  });

  it('returns 400 when userId is missing', async () => {
    const res = await request(app)
      .post('/api/notifications/unsubscribe')
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/notifications/vapid-public-key', () => {
  it('returns 503 when VAPID key not configured', async () => {
    const original = process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PUBLIC_KEY;
    const res = await request(app).get('/api/notifications/vapid-public-key');
    expect(res.status).toBe(503);
    process.env.VAPID_PUBLIC_KEY = original;
  });

  it('returns publicKey when configured', async () => {
    process.env.VAPID_PUBLIC_KEY = 'test-public-key';
    const res = await request(app).get('/api/notifications/vapid-public-key');
    expect(res.status).toBe(200);
    expect(res.body.publicKey).toBe('test-public-key');
    delete process.env.VAPID_PUBLIC_KEY;
  });
});
