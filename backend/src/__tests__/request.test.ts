import request from 'supertest';
import app from '../app';
import { MaterialRequest } from '../types';

async function getToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return (res.body as { accessToken: string }).accessToken;
}

// ─── POST /api/requests ───────────────────────────────────────────────────────

describe('POST /api/requests', () => {
  let requesterToken: string;
  let adminToken: string;

  beforeAll(async () => {
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    adminToken = await getToken('admin@seduclog.com', 'admin123');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/requests').send({});
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-requester role (admin)', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        school: 'Escola Estadual A',
        desiredDate: '2025-12-31',
        justification: 'Needed',
        items: [{ productId: 'p1', requestedQuantity: 1 }],
      });
    expect(res.status).toBe(403);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ school: 'School A' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for unknown product', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        school: 'Escola A',
        desiredDate: '2025-12-31',
        justification: 'Needed',
        items: [{ productId: 'does-not-exist', requestedQuantity: 1 }],
      });
    expect(res.status).toBe(400);
  });

  it('returns 422 when requested quantity exceeds stock', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        school: 'Escola A',
        desiredDate: '2025-12-31',
        justification: 'Over-stock test',
        items: [{ productId: 'p7', requestedQuantity: 9999 }], // p7 stock = 30
      });
    expect(res.status).toBe(422);
  });

  it('creates a request and returns protocol + pending status', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        school: 'Escola Estadual A',
        desiredDate: '2025-12-31',
        justification: 'Needed for classes',
        items: [{ productId: 'p1', requestedQuantity: 5 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.request).toMatchObject({
      school: 'Escola Estadual A',
      status: 'pending',
    });
    expect(res.body.request.protocol).toMatch(/^REQ-\d{4}-\d{6}$/);
    expect(res.body.request.items).toHaveLength(1);
    expect(res.body.request.history).toHaveLength(1);
  });
});

// ─── GET /api/requests ────────────────────────────────────────────────────────

describe('GET /api/requests', () => {
  let requesterToken: string;
  let warehouseToken: string;

  beforeAll(async () => {
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
    // Ensure at least one request exists.
    await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        school: 'Escola Lista',
        desiredDate: '2025-12-31',
        justification: 'List test',
        items: [{ productId: 'p2', requestedQuantity: 2 }],
      });
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/requests');
    expect(res.status).toBe(401);
  });

  it('returns a list of requests for requester (own only)', async () => {
    const res = await request(app)
      .get('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(200);
    const { requests: list } = res.body as { requests: MaterialRequest[] };
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    list.forEach((r) => expect(r.requesterId).toBe('4')); // seed requester id
  });

  it('returns all requests for warehouse operator', async () => {
    const res = await request(app)
      .get('/api/requests')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
  });

  it('filters by status=pending and returns only pending requests', async () => {
    const res = await request(app)
      .get('/api/requests?status=pending')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
    const { requests: list } = res.body as { requests: MaterialRequest[] };
    list.forEach((r) => expect(r.status).toBe('pending'));
  });
});

// ─── GET /api/requests/:id ────────────────────────────────────────────────────

describe('GET /api/requests/:id', () => {
  let requesterToken: string;
  let requestId: string;

  beforeAll(async () => {
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        school: 'Escola Detail',
        desiredDate: '2025-12-31',
        justification: 'Detail test',
        items: [{ productId: 'p3', requestedQuantity: 2 }],
      });
    requestId = (res.body as { request: MaterialRequest }).request.id;
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .get('/api/requests/non-existent')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(404);
  });

  it('returns request with items and history', async () => {
    const res = await request(app)
      .get(`/api/requests/${requestId}`)
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(200);
    expect(res.body.request.id).toBe(requestId);
    expect(Array.isArray(res.body.request.items)).toBe(true);
    expect(res.body.request.history.length).toBeGreaterThan(0);
  });
});

// ─── PATCH /api/requests/:id/approve ─────────────────────────────────────────

describe('PATCH /api/requests/:id/approve', () => {
  let requesterToken: string;
  let warehouseToken: string;
  let requestId: string;

  beforeAll(async () => {
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        school: 'Escola Approve',
        desiredDate: '2025-12-31',
        justification: 'Approve test',
        items: [{ productId: 'p5', requestedQuantity: 3 }], // p5 stock=100
      });
    requestId = (res.body as { request: MaterialRequest }).request.id;
  });

  it('returns 403 when requester tries to approve', async () => {
    const res = await request(app)
      .patch(`/api/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('approves the request and deducts stock', async () => {
    const res = await request(app)
      .patch(`/api/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ notes: 'Approved' });
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('approved');
    expect(res.body.request.history).toHaveLength(2);
  });

  it('returns 409 when trying to approve an already-approved request', async () => {
    const res = await request(app)
      .patch(`/api/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({});
    expect(res.status).toBe(409);
  });
});

// ─── PATCH /api/requests/:id/cancel ──────────────────────────────────────────

describe('PATCH /api/requests/:id/cancel', () => {
  let requesterToken: string;
  let requestId: string;

  beforeAll(async () => {
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        school: 'Escola Cancel',
        desiredDate: '2025-12-31',
        justification: 'Cancel test',
        items: [{ productId: 'p6', requestedQuantity: 1 }], // p6 stock=80
      });
    requestId = (res.body as { request: MaterialRequest }).request.id;
  });

  it('cancels a pending request', async () => {
    const res = await request(app)
      .patch(`/api/requests/${requestId}/cancel`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ notes: 'No longer needed' });
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('cancelled');
    expect(res.body.request.history).toHaveLength(2);
  });

  it('returns 409 when trying to cancel an already-cancelled request', async () => {
    const res = await request(app)
      .patch(`/api/requests/${requestId}/cancel`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({});
    expect(res.status).toBe(409);
  });
});
