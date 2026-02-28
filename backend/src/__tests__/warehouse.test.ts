import request from 'supertest';
import app from '../app';
import { MaterialRequest, DeliveryOrder, InventorySession } from '../types';

async function getToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return (res.body as { accessToken: string }).accessToken;
}

// Helper: create + approve a request so it can be used in delivery order tests.
async function createApprovedRequest(
  requesterToken: string,
  warehouseToken: string,
  productId = 'p8',
  qty = 2,
): Promise<MaterialRequest> {
  const createRes = await request(app)
    .post('/api/requests')
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({
      school: 'Escola Warehouse',
      desiredDate: '2025-12-31',
      justification: 'Warehouse test',
      items: [{ productId, requestedQuantity: qty }],
    });
  const created = (createRes.body as { request: MaterialRequest }).request;

  const approveRes = await request(app)
    .patch(`/api/requests/${created.id}/approve`)
    .set('Authorization', `Bearer ${warehouseToken}`)
    .send({ notes: 'Approved for test' });
  return (approveRes.body as { request: MaterialRequest }).request;
}

// ─── GET /api/warehouse/queue ─────────────────────────────────────────────────

describe('GET /api/warehouse/queue', () => {
  let warehouseToken: string;
  let requesterToken: string;

  beforeAll(async () => {
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    // Ensure at least one request exists.
    await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        school: 'Queue School',
        desiredDate: '2026-01-01',
        justification: 'Queue test',
        items: [{ productId: 'p4', requestedQuantity: 1 }],
      });
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/warehouse/queue');
    expect(res.status).toBe(401);
  });

  it('returns 403 for requester role', async () => {
    const res = await request(app)
      .get('/api/warehouse/queue')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(403);
  });

  it('returns pending/approved queue for warehouse operator', async () => {
    const res = await request(app)
      .get('/api/warehouse/queue')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.queue)).toBe(true);
    res.body.queue.forEach((r: MaterialRequest) => {
      expect(['pending', 'approved']).toContain(r.status);
    });
  });

  it('queue is ordered by desiredDate ascending', async () => {
    const res = await request(app)
      .get('/api/warehouse/queue')
      .set('Authorization', `Bearer ${warehouseToken}`);
    const q = res.body.queue as MaterialRequest[];
    for (let i = 1; i < q.length; i++) {
      const prev = new Date(q[i - 1].desiredDate).getTime();
      const curr = new Date(q[i].desiredDate).getTime();
      expect(prev).toBeLessThanOrEqual(curr);
    }
  });
});

// ─── POST /api/warehouse/orders ───────────────────────────────────────────────

describe('POST /api/warehouse/orders', () => {
  let warehouseToken: string;
  let requesterToken: string;

  beforeAll(async () => {
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/warehouse/orders')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ requestId: 'x' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown requestId', async () => {
    const res = await request(app)
      .post('/api/warehouse/orders')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ requestId: 'non-existent', driverId: '3', vehicleId: 'v1' });
    expect(res.status).toBe(404);
  });

  it('returns 409 for a pending (non-approved) request', async () => {
    const createRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        school: 'School Order Test',
        desiredDate: '2025-12-31',
        justification: 'Order test',
        items: [{ productId: 'p1', requestedQuantity: 1 }],
      });
    const pendingId = (createRes.body as { request: MaterialRequest }).request.id;

    const res = await request(app)
      .post('/api/warehouse/orders')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ requestId: pendingId, driverId: '3', vehicleId: 'v2' });
    expect(res.status).toBe(409);
  });

  it('creates delivery order for approved request', async () => {
    const approved = await createApprovedRequest(requesterToken, warehouseToken, 'p3', 1);

    const res = await request(app)
      .post('/api/warehouse/orders')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        requestId: approved.id,
        driverId: '3',
        vehicleId: 'v3',
        estimatedRoute: 'Rua A → Escola B',
      });
    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({
      requestId: approved.id,
      driverName: 'Driver User',
      vehiclePlate: 'GHI-9012',
      status: 'created',
    });
    expect(res.body.order.picklist).toHaveLength(1);
  });
});

// ─── PATCH /api/warehouse/orders/:id/start-picking ───────────────────────────

describe('PATCH /api/warehouse/orders/:id/start-picking', () => {
  let warehouseToken: string;
  let requesterToken: string;
  let orderId: string;

  beforeAll(async () => {
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
    requesterToken = await getToken('requester@seduclog.com', 'requester123');

    const approved = await createApprovedRequest(requesterToken, warehouseToken, 'p2', 1);
    const orderRes = await request(app)
      .post('/api/warehouse/orders')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ requestId: approved.id, driverId: '3', vehicleId: 'v1' });
    orderId = (orderRes.body as { order: DeliveryOrder }).order.id;
  });

  it('returns 404 for unknown order id', async () => {
    const res = await request(app)
      .patch('/api/warehouse/orders/unknown/start-picking')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({});
    expect(res.status).toBe(404);
  });

  it('marks order as picking and returns checklist', async () => {
    const res = await request(app)
      .patch(`/api/warehouse/orders/${orderId}/start-picking`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('picking');
    expect(Array.isArray(res.body.order.picklist)).toBe(true);
  });

  it('returns 409 if already picking', async () => {
    const res = await request(app)
      .patch(`/api/warehouse/orders/${orderId}/start-picking`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({});
    expect(res.status).toBe(409);
  });
});

// ─── GET /api/warehouse/stock ─────────────────────────────────────────────────

describe('GET /api/warehouse/stock', () => {
  let warehouseToken: string;

  beforeAll(async () => {
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
  });

  it('returns full product list', async () => {
    const res = await request(app)
      .get('/api/warehouse/stock')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBeGreaterThan(0);
    expect(res.body.products[0]).toHaveProperty('minStock');
  });

  it('filters by category', async () => {
    const res = await request(app)
      .get('/api/warehouse/stock?category=Papelaria')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
    res.body.products.forEach((p: { category: string }) => {
      expect(p.category).toBe('Papelaria');
    });
  });

  it('filters by search term', async () => {
    const res = await request(app)
      .get('/api/warehouse/stock?search=Tesoura')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].name).toBe('Tesoura');
  });
});

// ─── POST /api/warehouse/stock/movement ──────────────────────────────────────

describe('POST /api/warehouse/stock/movement', () => {
  let warehouseToken: string;

  beforeAll(async () => {
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/warehouse/stock/movement')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ productId: 'p1' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown product', async () => {
    const res = await request(app)
      .post('/api/warehouse/stock/movement')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ productId: 'does-not-exist', quantity: 10 });
    expect(res.status).toBe(404);
  });

  it('registers stock entry and increments product stock', async () => {
    const res = await request(app)
      .post('/api/warehouse/stock/movement')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ productId: 'p8', quantity: 50, invoiceRef: 'NF-001', notes: 'Supplier delivery' });
    expect(res.status).toBe(201);
    expect(res.body.movement).toMatchObject({
      productId: 'p8',
      type: 'entry',
      quantity: 50,
    });
    expect(res.body.movement).toHaveProperty('invoiceRef', 'NF-001');
    // newStock must equal previousStock + quantity (delta is always +qty for entries).
    expect(res.body.movement.newStock).toBe(res.body.movement.previousStock + 50);
  });
});

// ─── GET /api/warehouse/stock/alerts ─────────────────────────────────────────

describe('GET /api/warehouse/stock/alerts', () => {
  let warehouseToken: string;

  beforeAll(async () => {
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
  });

  it('returns low-stock products', async () => {
    const res = await request(app)
      .get('/api/warehouse/stock/alerts')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.alerts)).toBe(true);
    // p7 (Tesoura) has stock=30 and minStock=30 — should appear (stock <= minStock).
    const hasTeasoura = (res.body.alerts as Array<{ name: string }>).some(
      (a) => a.name === 'Tesoura',
    );
    expect(hasTeasoura).toBe(true);
  });
});

// ─── POST /api/warehouse/inventory ───────────────────────────────────────────

describe('POST /api/warehouse/inventory', () => {
  let warehouseToken: string;

  beforeAll(async () => {
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
  });

  it('starts inventory session with current stock snapshot', async () => {
    const res = await request(app)
      .post('/api/warehouse/inventory')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({});
    expect(res.status).toBe(201);
    expect(res.body.inventory.status).toBe('open');
    expect(Array.isArray(res.body.inventory.items)).toBe(true);
    expect(res.body.inventory.items.length).toBeGreaterThan(0);
    expect(res.body.inventory.items[0]).toHaveProperty('systemStock');
  });
});

// ─── PATCH /api/warehouse/inventory/:id/reconcile ────────────────────────────

describe('PATCH /api/warehouse/inventory/:id/reconcile', () => {
  let warehouseToken: string;
  let sessionId: string;

  beforeAll(async () => {
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');

    const res = await request(app)
      .post('/api/warehouse/inventory')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({});
    sessionId = (res.body as { inventory: InventorySession }).inventory.id;
  });

  it('returns 400 when counts are missing', async () => {
    const res = await request(app)
      .patch(`/api/warehouse/inventory/${sessionId}/reconcile`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown session', async () => {
    const res = await request(app)
      .patch('/api/warehouse/inventory/non-existent/reconcile')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ counts: [{ productId: 'p1', physicalCount: 100 }] });
    expect(res.status).toBe(404);
  });

  it('reconciles inventory and applies adjustments', async () => {
    const res = await request(app)
      .patch(`/api/warehouse/inventory/${sessionId}/reconcile`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        counts: [
          { productId: 'p1', physicalCount: 400 },
          { productId: 'p2', physicalCount: 180 },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.inventory.status).toBe('reconciled');
    const item = (res.body.inventory.items as InventorySession['items']).find(
      (i) => i.productId === 'p1',
    );
    expect(item?.physicalCount).toBe(400);
    expect(item?.adjustment).toBeDefined();
  });

  it('returns 409 if session is already reconciled', async () => {
    const res = await request(app)
      .patch(`/api/warehouse/inventory/${sessionId}/reconcile`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ counts: [{ productId: 'p1', physicalCount: 400 }] });
    expect(res.status).toBe(409);
  });
});

// ─── GET /api/warehouse/drivers ──────────────────────────────────────────────

describe('GET /api/warehouse/drivers', () => {
  let warehouseToken: string;

  beforeAll(async () => {
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
  });

  it('returns drivers and available vehicles', async () => {
    const res = await request(app)
      .get('/api/warehouse/drivers')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.drivers)).toBe(true);
    expect(Array.isArray(res.body.vehicles)).toBe(true);
    expect(res.body.drivers.length).toBeGreaterThan(0);
    expect(res.body.drivers[0]).toHaveProperty('name');
  });
});
