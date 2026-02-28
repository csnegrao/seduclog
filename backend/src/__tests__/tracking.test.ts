import request from 'supertest';
import app from '../app';
import { MaterialRequest, DeliveryOrder } from '../types';

async function getToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return (res.body as { accessToken: string }).accessToken;
}

/**
 * Creates an approved request and a delivery order, then moves the order
 * to in_transit (pickup confirmed). Returns the created request and order.
 */
async function setupTrackingFixture(
  requesterToken: string,
  warehouseToken: string,
  driverToken: string,
  productId = 'p7',
  qty = 1,
  vehicleId = 'v3',
): Promise<{ req: MaterialRequest; order: DeliveryOrder }> {
  // 1. Create request.
  const createRes = await request(app)
    .post('/api/requests')
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({
      school: 'Escola Tracking',
      desiredDate: '2026-12-31',
      justification: 'Tracking test',
      items: [{ productId, requestedQuantity: qty }],
    });
  const createdReq = (createRes.body as { request: MaterialRequest }).request;

  // 2. Approve.
  await request(app)
    .patch(`/api/requests/${createdReq.id}/approve`)
    .set('Authorization', `Bearer ${warehouseToken}`)
    .send({ notes: 'Approved for tracking test' });

  // 3. Create delivery order.
  const orderRes = await request(app)
    .post('/api/warehouse/orders')
    .set('Authorization', `Bearer ${warehouseToken}`)
    .send({
      requestId: createdReq.id,
      driverId: '3',
      vehicleId,
      estimatedRoute: 'Almoxarifado → Escola Tracking, Fortaleza',
    });
  const order = (orderRes.body as { order: DeliveryOrder }).order;

  // 4. Driver confirms pickup.
  await request(app)
    .patch(`/api/driver/orders/${order.id}/pickup`)
    .set('Authorization', `Bearer ${driverToken}`)
    .send({});

  return { req: createdReq, order };
}

// ─── GET /api/requests/:id/tracking ──────────────────────────────────────────

describe('GET /api/requests/:id/tracking', () => {
  let requesterToken: string;
  let warehouseToken: string;
  let driverToken: string;
  let adminToken: string;

  beforeAll(async () => {
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
    driverToken = await getToken('driver@seduclog.com', 'driver123');
    adminToken = await getToken('admin@seduclog.com', 'admin123');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/requests/some-id/tracking');
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown request id', async () => {
    const res = await request(app)
      .get('/api/requests/nonexistent/tracking')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('requester can view tracking for their own request', async () => {
    const { req } = await setupTrackingFixture(
      requesterToken,
      warehouseToken,
      driverToken,
      'p7',
      1,
      'v3',
    );

    const res = await request(app)
      .get(`/api/requests/${req.id}/tracking`)
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    const { tracking } = res.body as {
      tracking: {
        requestId: string;
        requestStatus: string;
        order: DeliveryOrder | null;
        position: { lat: number; lng: number; eta?: number } | null;
      };
    };
    expect(tracking.requestId).toBe(req.id);
    expect(tracking.requestStatus).toBe('in_transit');
    expect(tracking.order).not.toBeNull();
    expect(tracking.order!.status).toBe('in_transit');
    // No location updates yet.
    expect(tracking.position).toBeNull();
  });

  it('tracking position is populated after driver updates location', async () => {
    const { req, order } = await setupTrackingFixture(
      requesterToken,
      warehouseToken,
      driverToken,
      'p4',
      1,
      'v4',
    );

    // Driver sends a location update.
    await request(app)
      .post(`/api/driver/orders/${order.id}/location`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ lat: -3.7172, lng: -38.5434 });

    const res = await request(app)
      .get(`/api/requests/${req.id}/tracking`)
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    const { tracking } = res.body as {
      tracking: { position: { lat: number; lng: number } | null };
    };
    expect(tracking.position).not.toBeNull();
    expect(tracking.position!.lat).toBeCloseTo(-3.7172, 4);
    expect(tracking.position!.lng).toBeCloseTo(-38.5434, 4);
  });

  it('admin can view tracking for any request', async () => {
    const { req } = await setupTrackingFixture(
      requesterToken,
      warehouseToken,
      driverToken,
      'p5',
      1,
      'v5',
    );

    const res = await request(app)
      .get(`/api/requests/${req.id}/tracking`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('returns tracking with null order when no delivery order exists', async () => {
    // Create a plain pending request (no delivery order).
    const createRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        school: 'Escola Pending',
        desiredDate: '2026-12-31',
        justification: 'No order yet',
        items: [{ productId: 'p6', requestedQuantity: 1 }],
      });
    const pendingReq = (createRes.body as { request: MaterialRequest }).request;

    const res = await request(app)
      .get(`/api/requests/${pendingReq.id}/tracking`)
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    const { tracking } = res.body as { tracking: { order: DeliveryOrder | null; position: null } };
    expect(tracking.order).toBeNull();
    expect(tracking.position).toBeNull();
  });
});
