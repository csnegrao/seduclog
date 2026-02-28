import request from 'supertest';
import app from '../app';
import { MaterialRequest, DeliveryOrder } from '../types';

async function getToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return (res.body as { accessToken: string }).accessToken;
}

/** Create and fully approve a request, then create a delivery order for the driver. */
async function setupOrderForDriver(
  requesterToken: string,
  warehouseToken: string,
  productId = 'p4',
  qty = 1,
  vehicleId = 'v4',
): Promise<DeliveryOrder> {
  // 1. Create request.
  const createRes = await request(app)
    .post('/api/requests')
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({
      school: 'Escola Driver',
      desiredDate: '2026-12-31',
      justification: 'Driver test',
      items: [{ productId, requestedQuantity: qty }],
    });
  const created = (createRes.body as { request: MaterialRequest }).request;

  // 2. Approve.
  await request(app)
    .patch(`/api/requests/${created.id}/approve`)
    .set('Authorization', `Bearer ${warehouseToken}`)
    .send({ notes: 'Approved' });

  // 3. Create delivery order (driver id = '3').
  const orderRes = await request(app)
    .post('/api/warehouse/orders')
    .set('Authorization', `Bearer ${warehouseToken}`)
    .send({
      requestId: created.id,
      driverId: '3',
      vehicleId,
      estimatedRoute: 'Almoxarifado → Escola Driver',
    });

  return (orderRes.body as { order: DeliveryOrder }).order;
}

// ─── GET /api/driver/orders ───────────────────────────────────────────────────

describe('GET /api/driver/orders', () => {
  let driverToken: string;
  let warehouseToken: string;
  let requesterToken: string;

  beforeAll(async () => {
    driverToken = await getToken('driver@seduclog.com', 'driver123');
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    // Ensure at least one order exists.
    await setupOrderForDriver(requesterToken, warehouseToken, 'p5', 1, 'v4');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/driver/orders');
    expect(res.status).toBe(401);
  });

  it('returns 403 for requester role', async () => {
    const res = await request(app)
      .get('/api/driver/orders')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(403);
  });

  it('returns orders assigned to authenticated driver', async () => {
    const res = await request(app)
      .get('/api/driver/orders')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.orders.length).toBeGreaterThan(0);
    res.body.orders.forEach((o: DeliveryOrder) => {
      expect(o.driverId).toBe('3'); // seed driver id
    });
  });
});

// ─── PATCH /api/driver/orders/:id/pickup ─────────────────────────────────────

describe('PATCH /api/driver/orders/:id/pickup', () => {
  let driverToken: string;
  let warehouseToken: string;
  let requesterToken: string;
  let orderId: string;

  beforeAll(async () => {
    driverToken = await getToken('driver@seduclog.com', 'driver123');
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    const order = await setupOrderForDriver(requesterToken, warehouseToken, 'p6', 1, 'v5');
    orderId = order.id;
  });

  it('returns 404 for unknown order', async () => {
    const res = await request(app)
      .patch('/api/driver/orders/nonexistent/pickup')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});
    expect(res.status).toBe(404);
  });

  it('confirms pickup and moves order to in_transit', async () => {
    const res = await request(app)
      .patch(`/api/driver/orders/${orderId}/pickup`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('in_transit');
  });

  it('returns 409 if already in_transit', async () => {
    const res = await request(app)
      .patch(`/api/driver/orders/${orderId}/pickup`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});
    expect(res.status).toBe(409);
  });
});

// ─── POST /api/driver/orders/:id/location ─────────────────────────────────────

describe('POST /api/driver/orders/:id/location', () => {
  let driverToken: string;
  let warehouseToken: string;
  let requesterToken: string;
  let orderId: string;

  beforeAll(async () => {
    driverToken = await getToken('driver@seduclog.com', 'driver123');
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    const order = await setupOrderForDriver(requesterToken, warehouseToken, 'p3', 1, 'v6');
    orderId = order.id;
    // Move to in_transit first.
    await request(app)
      .patch(`/api/driver/orders/${orderId}/pickup`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});
  });

  it('returns 400 when lat/lng are missing', async () => {
    const res = await request(app)
      .post(`/api/driver/orders/${orderId}/location`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('records location update', async () => {
    const res = await request(app)
      .post(`/api/driver/orders/${orderId}/location`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ lat: -3.7172, lng: -38.5434 });
    expect(res.status).toBe(200);
    expect(res.body.routeUpdate).toMatchObject({
      orderId,
      lat: -3.7172,
      lng: -38.5434,
    });
  });
});

// ─── POST /api/driver/orders/:id/occurrence ───────────────────────────────────

describe('POST /api/driver/orders/:id/occurrence', () => {
  let driverToken: string;
  let warehouseToken: string;
  let requesterToken: string;
  let orderId: string;

  beforeAll(async () => {
    driverToken = await getToken('driver@seduclog.com', 'driver123');
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    const order = await setupOrderForDriver(requesterToken, warehouseToken, 'p2', 1, 'v7');
    orderId = order.id;
  });

  it('returns 400 when description is missing', async () => {
    const res = await request(app)
      .post(`/api/driver/orders/${orderId}/occurrence`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('registers occurrence', async () => {
    const res = await request(app)
      .post(`/api/driver/orders/${orderId}/occurrence`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ description: 'Trânsito intenso na Av. Bezerra de Menezes' });
    expect(res.status).toBe(201);
    expect(res.body.occurrence).toMatchObject({
      orderId,
      description: 'Trânsito intenso na Av. Bezerra de Menezes',
    });
  });
});

// ─── POST /api/driver/orders/:id/deliver ─────────────────────────────────────

describe('POST /api/driver/orders/:id/deliver', () => {
  let driverToken: string;
  let warehouseToken: string;
  let requesterToken: string;
  let orderId: string;
  let picklistItemId: string;

  beforeAll(async () => {
    driverToken = await getToken('driver@seduclog.com', 'driver123');
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    const order = await setupOrderForDriver(requesterToken, warehouseToken, 'p1', 3, 'v1');
    orderId = order.id;
    picklistItemId = order.picklist[0].itemId;

    // Move to in_transit.
    await request(app)
      .patch(`/api/driver/orders/${orderId}/pickup`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});
  });

  it('returns 400 when signatureBase64 is missing', async () => {
    const res = await request(app)
      .post(`/api/driver/orders/${orderId}/deliver`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ items: [{ itemId: picklistItemId, status: 'delivered', deliveredQuantity: 3 }] });
    expect(res.status).toBe(400);
  });

  it('returns 400 when items checklist is missing', async () => {
    const res = await request(app)
      .post(`/api/driver/orders/${orderId}/deliver`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ signatureBase64: 'abc', items: [] });
    expect(res.status).toBe(400);
  });

  it('confirms delivery, updates statuses, restores partial stock', async () => {
    const res = await request(app)
      .post(`/api/driver/orders/${orderId}/deliver`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        items: [{ itemId: picklistItemId, status: 'partial', deliveredQuantity: 2 }],
        notes: 'Delivered 2 out of 3',
        signatureBase64: 'fakesignaturebase64data',
      });
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('delivered');
    expect(res.body.order).toHaveProperty('deliverySignature');
    expect(res.body.order).toHaveProperty('deliveredAt');
  });

  it('returns 409 if already delivered', async () => {
    const res = await request(app)
      .post(`/api/driver/orders/${orderId}/deliver`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        items: [{ itemId: picklistItemId, status: 'delivered', deliveredQuantity: 3 }],
        signatureBase64: 'fakesig',
      });
    expect(res.status).toBe(409);
  });
});
