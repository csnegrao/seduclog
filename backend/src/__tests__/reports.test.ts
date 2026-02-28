import request from 'supertest';
import app from '../app';
import { MaterialRequest, DeliveryOrder } from '../types';

async function getToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return (res.body as { accessToken: string }).accessToken;
}

/**
 * Creates a full request → approve → delivery order → pickup pipeline
 * so that reports have data to aggregate.
 */
async function createDeliveredOrder(
  requesterToken: string,
  warehouseToken: string,
  driverToken: string,
  productId: string,
  vehicleId: string,
): Promise<DeliveryOrder> {
  const createRes = await request(app)
    .post('/api/requests')
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({
      school: 'Escola Reports',
      desiredDate: '2026-12-31',
      justification: 'Reports test',
      items: [{ productId, requestedQuantity: 1 }],
    });
  const req_ = (createRes.body as { request: MaterialRequest }).request;

  await request(app)
    .patch(`/api/requests/${req_.id}/approve`)
    .set('Authorization', `Bearer ${warehouseToken}`)
    .send({ notes: 'ok' });

  const orderRes = await request(app)
    .post('/api/warehouse/orders')
    .set('Authorization', `Bearer ${warehouseToken}`)
    .send({
      requestId: req_.id,
      driverId: '3',
      vehicleId,
      estimatedRoute: 'Almoxarifado → Escola Reports',
    });
  const order = (orderRes.body as { order: DeliveryOrder }).order;

  // Pickup
  await request(app)
    .patch(`/api/driver/orders/${order.id}/pickup`)
    .set('Authorization', `Bearer ${driverToken}`)
    .send({});

  return order;
}

// ─── Auth / role guards ────────────────────────────────────────────────────────

describe('Reports – auth and role guards', () => {
  let managerToken: string;
  let requesterToken: string;

  beforeAll(async () => {
    managerToken = await getToken('manager@seduclog.com', 'manager123');
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
  });

  const endpoints = [
    '/api/reports/summary',
    '/api/reports/deliveries',
    '/api/reports/stock',
    '/api/reports/driver-performance',
    '/api/reports/divergences',
  ];

  for (const ep of endpoints) {
    it(`GET ${ep} returns 401 without token`, async () => {
      const res = await request(app).get(ep);
      expect(res.status).toBe(401);
    });

    it(`GET ${ep} returns 403 for requester role`, async () => {
      const res = await request(app)
        .get(ep)
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(res.status).toBe(403);
    });

    it(`GET ${ep} returns 200 for manager`, async () => {
      const res = await request(app)
        .get(ep)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
    });
  }
});

// ─── GET /api/reports/summary ─────────────────────────────────────────────────

describe('GET /api/reports/summary', () => {
  let managerToken: string;

  beforeAll(async () => {
    managerToken = await getToken('manager@seduclog.com', 'manager123');
  });

  it('returns summary with byStatus and dailyVolume fields', async () => {
    const res = await request(app)
      .get('/api/reports/summary')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    const { summary } = res.body as {
      summary: { totalRequests: number; byStatus: Record<string, number>; dailyVolume: unknown[] };
    };
    expect(typeof summary.totalRequests).toBe('number');
    expect(typeof summary.byStatus).toBe('object');
    expect(Array.isArray(summary.dailyVolume)).toBe(true);
    // All statuses present
    expect(summary.byStatus).toHaveProperty('pending');
    expect(summary.byStatus).toHaveProperty('delivered');
  });

  it('accepts startDate/endDate query params without error', async () => {
    const res = await request(app)
      .get('/api/reports/summary?startDate=2025-01-01&endDate=2026-12-31')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/reports/deliveries ─────────────────────────────────────────────

describe('GET /api/reports/deliveries', () => {
  let managerToken: string;
  let requesterToken: string;
  let warehouseToken: string;
  let driverToken: string;

  beforeAll(async () => {
    managerToken = await getToken('manager@seduclog.com', 'manager123');
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
    driverToken = await getToken('driver@seduclog.com', 'driver123');

    // Create a delivered order so metrics have real data.
    await createDeliveredOrder(requesterToken, warehouseToken, driverToken, 'p2', 'v6');
  });

  it('returns deliveries performance shape', async () => {
    const res = await request(app)
      .get('/api/reports/deliveries')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    const { deliveries } = res.body as {
      deliveries: {
        total: number;
        deliveredCount: number;
        onTimeRate: number | null;
        avgDeliveryTimeMin: number | null;
        bySchool: Array<{ school: string; total: number; delivered: number }>;
      };
    };
    expect(typeof deliveries.total).toBe('number');
    expect(typeof deliveries.deliveredCount).toBe('number');
    expect(Array.isArray(deliveries.bySchool)).toBe(true);
  });

  it('filters by driverId', async () => {
    const res = await request(app)
      .get('/api/reports/deliveries?driverId=3')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    const { deliveries } = res.body as {
      deliveries: { bySchool: Array<{ school: string }> };
    };
    // Driver 3 delivered at Escola Reports
    expect(deliveries.bySchool.some((s) => s.school === 'Escola Reports')).toBe(true);
  });
});

// ─── GET /api/reports/stock ───────────────────────────────────────────────────

describe('GET /api/reports/stock', () => {
  let managerToken: string;

  beforeAll(async () => {
    managerToken = await getToken('manager@seduclog.com', 'manager123');
  });

  it('returns stock snapshot shape', async () => {
    const res = await request(app)
      .get('/api/reports/stock')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    const { stock } = res.body as {
      stock: {
        products: Array<{ id: string; stock: number; isCritical: boolean }>;
        alerts: Array<{ id: string }>;
        topProducts: Array<{ productId: string; totalRequested: number }>;
        movementCount: number;
      };
    };
    expect(Array.isArray(stock.products)).toBe(true);
    expect(Array.isArray(stock.alerts)).toBe(true);
    expect(Array.isArray(stock.topProducts)).toBe(true);
    expect(stock.products.length).toBeGreaterThan(0);
    // Products have required fields
    const p = stock.products[0];
    expect(p).toHaveProperty('id');
    expect(p).toHaveProperty('stock');
    expect(typeof p.isCritical).toBe('boolean');
  });

  it('topProducts are sorted by totalRequested descending', async () => {
    const res = await request(app)
      .get('/api/reports/stock')
      .set('Authorization', `Bearer ${managerToken}`);
    const { stock } = res.body as {
      stock: { topProducts: Array<{ totalRequested: number }> };
    };
    for (let i = 0; i < stock.topProducts.length - 1; i += 1) {
      expect(stock.topProducts[i].totalRequested).toBeGreaterThanOrEqual(
        stock.topProducts[i + 1].totalRequested,
      );
    }
  });
});

// ─── GET /api/reports/driver-performance ─────────────────────────────────────

describe('GET /api/reports/driver-performance', () => {
  let managerToken: string;

  beforeAll(async () => {
    managerToken = await getToken('manager@seduclog.com', 'manager123');
  });

  it('returns performance array with correct shape', async () => {
    const res = await request(app)
      .get('/api/reports/driver-performance')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    const { performance } = res.body as {
      performance: Array<{
        driverId: string;
        driverName: string;
        totalDeliveries: number;
        deliveredCount: number;
        onTimeRate: number | null;
        avgDeliveryTimeMin: number | null;
        occurrenceCount: number;
      }>;
    };
    expect(Array.isArray(performance)).toBe(true);
    if (performance.length > 0) {
      const p = performance[0];
      expect(p).toHaveProperty('driverId');
      expect(p).toHaveProperty('totalDeliveries');
      expect(p).toHaveProperty('occurrenceCount');
    }
  });

  it('filters by driverId', async () => {
    const res = await request(app)
      .get('/api/reports/driver-performance?driverId=3')
      .set('Authorization', `Bearer ${managerToken}`);
    const { performance } = res.body as { performance: Array<{ driverId: string }> };
    // Only driverId=3 returned (or empty if no orders for that driver in this test suite run)
    for (const p of performance) {
      expect(p.driverId).toBe('3');
    }
  });
});

// ─── GET /api/reports/divergences ────────────────────────────────────────────

describe('GET /api/reports/divergences', () => {
  let managerToken: string;

  beforeAll(async () => {
    managerToken = await getToken('manager@seduclog.com', 'manager123');
  });

  it('returns divergences array', async () => {
    const res = await request(app)
      .get('/api/reports/divergences')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    const { divergences } = res.body as {
      divergences: Array<{
        orderId: string;
        requestProtocol: string;
        school: string;
        items: Array<{ divergenceType: string }>;
      }>;
    };
    expect(Array.isArray(divergences)).toBe(true);
    // All returned divergences have at least one item
    for (const d of divergences) {
      expect(d.items.length).toBeGreaterThan(0);
      for (const item of d.items) {
        expect(['missing', 'partial']).toContain(item.divergenceType);
      }
    }
  });

  it('accepts date range query params', async () => {
    const res = await request(app)
      .get('/api/reports/divergences?startDate=2025-01-01&endDate=2026-12-31')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
  });
});
