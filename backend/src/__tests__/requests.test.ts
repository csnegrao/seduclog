/**
 * Integration tests for the Material Request module.
 *
 * These tests exercise the requests endpoints using an in-memory mock of the
 * PrismaClient so no real database connection is required.
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Mock @prisma/client — must come before app import
// ---------------------------------------------------------------------------

const mockMaterials = [
  { id: 'mat1', name: 'Papel A4', unit: 'resma', currentStock: 100, active: true },
  { id: 'mat2', name: 'Caneta Azul', unit: 'caixa', currentStock: 5, active: true },
];

// Shared mock functions — initialised lazily inside the factory
let prismaFindFirstMock: jest.Mock;
let prismaCreateMock: jest.Mock;
let prismaFindManyMaterialsMock: jest.Mock;
let prismaFindUniqueMock: jest.Mock;
let prismaFindManyMock: jest.Mock;

jest.mock('@prisma/client', () => {
  const RequestStatus = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    IN_PROGRESS: 'IN_PROGRESS',
    IN_TRANSIT: 'IN_TRANSIT',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
  };

  // Lazily bind to the outer variables so they can be reassigned per test
  const PrismaClient = jest.fn().mockImplementation(() => ({
    materialRequest: {
      get findFirst() { return prismaFindFirstMock; },
      get findMany() { return prismaFindManyMock; },
      get findUnique() { return prismaFindUniqueMock; },
      get create() { return prismaCreateMock; },
      update: jest.fn(),
    },
    material: {
      get findMany() { return prismaFindManyMaterialsMock; },
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    requestItem: { update: jest.fn() },
    stockMovement: { create: jest.fn() },
    requestHistory: { create: jest.fn() },
    message: { create: jest.fn() },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'user1',
        name: 'Test User',
        email: 'test@test.com',
        role: 'REQUESTER',
        active: true,
      }),
    },
    $transaction: jest.fn().mockImplementation(async (ops: unknown) => {
      if (typeof ops === 'function') {
        const txMock = {
          requestItem: { update: jest.fn() },
          material: { update: jest.fn() },
          stockMovement: { create: jest.fn() },
          materialRequest: { update: jest.fn() },
          requestHistory: { create: jest.fn() },
        };
        return (ops as (tx: typeof txMock) => Promise<unknown>)(txMock);
      }
      return Promise.all(ops as Promise<unknown>[]);
    }),
    $disconnect: jest.fn(),
  }));

  return { PrismaClient, RequestStatus };
});

import app from '../app';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JWT_SECRET = 'dev-only-secret-change-in-production';

function makeToken(role: string, userId = 'user1') {
  return jwt.sign({ userId, email: 'test@test.com', role }, JWT_SECRET, { expiresIn: '1h' });
}

// Initialise all mock functions before any test suite runs
beforeAll(() => {
  prismaFindFirstMock = jest.fn();
  prismaCreateMock = jest.fn();
  prismaFindManyMaterialsMock = jest.fn().mockResolvedValue(mockMaterials);
  prismaFindUniqueMock = jest.fn();
  prismaFindManyMock = jest.fn().mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaFindFirstMock.mockResolvedValue(null); // no previous protocol
    // Return only mat1 so length matches the single-item requests in tests
    prismaFindManyMaterialsMock.mockResolvedValue([mockMaterials[0]]);
    prismaCreateMock.mockResolvedValue({
      id: 'req1',
      protocol: 'REQ-2026-000001',
      status: 'PENDING',
      requesterId: 'user1',
      desiredDate: new Date().toISOString(),
      justification: 'Need supplies for the school year.',
      items: [],
      history: [],
    });
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/requests').send({});
    expect(res.status).toBe(401);
  });

  it('returns 403 when non-REQUESTER tries to create', async () => {
    const token = makeToken('DRIVER');
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ materialId: 'mat1', requestedQty: 5 }],
        desiredDate: '2026-06-01',
        justification: 'Need supplies for the school year.',
      });
    expect(res.status).toBe(403);
  });

  it('returns 400 when items array is missing', async () => {
    const token = makeToken('REQUESTER');
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ desiredDate: '2026-06-01', justification: 'Need supplies for school.' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when desiredDate is missing', async () => {
    const token = makeToken('REQUESTER');
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ materialId: 'mat1', requestedQty: 5 }], justification: 'Need supplies for school.' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when justification is too short', async () => {
    const token = makeToken('REQUESTER');
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ materialId: 'mat1', requestedQty: 5 }], desiredDate: '2026-06-01', justification: 'Short' });
    expect(res.status).toBe(400);
  });

  it('returns 422 when stock is insufficient', async () => {
    prismaFindManyMaterialsMock.mockResolvedValue([
      { id: 'mat1', name: 'Papel A4', unit: 'resma', currentStock: 2, active: true },
    ]);
    const token = makeToken('REQUESTER');
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ materialId: 'mat1', requestedQty: 50 }],
        desiredDate: '2026-06-01',
        justification: 'Need lots of paper for the year.',
      });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('details');
  });

  it('returns 201 with protocol on valid request', async () => {
    const token = makeToken('REQUESTER');
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ materialId: 'mat1', requestedQty: 5 }],
        desiredDate: '2026-06-01',
        justification: 'Need supplies for the school year.',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('protocol');
    expect(res.body.protocol).toMatch(/^REQ-\d{4}-\d{6}$/);
  });
});

describe('GET /api/requests', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/requests');
    expect(res.status).toBe(401);
  });

  it('returns 200 with array for authenticated user', async () => {
    prismaFindManyMock.mockResolvedValue([]);
    const token = makeToken('REQUESTER');
    const res = await request(app)
      .get('/api/requests')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/requests/:id', () => {
  it('returns 404 for non-existent request', async () => {
    prismaFindUniqueMock.mockResolvedValue(null);
    const token = makeToken('WAREHOUSE_OPERATOR');
    const res = await request(app)
      .get('/api/requests/nonexistent')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 403 when REQUESTER tries to access another user request', async () => {
    prismaFindUniqueMock.mockResolvedValue({
      id: 'req1',
      requesterId: 'other-user',
      status: 'PENDING',
      items: [],
      history: [],
      messages: [],
      requester: {},
    });
    const token = makeToken('REQUESTER', 'user1');
    const res = await request(app)
      .get('/api/requests/req1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 when REQUESTER accesses their own request', async () => {
    prismaFindUniqueMock.mockResolvedValue({
      id: 'req1',
      requesterId: 'user1',
      status: 'PENDING',
      items: [],
      history: [],
      messages: [],
      requester: {},
    });
    const token = makeToken('REQUESTER', 'user1');
    const res = await request(app)
      .get('/api/requests/req1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/requests/:id/approve', () => {
  it('returns 403 for non-operator role', async () => {
    const token = makeToken('REQUESTER');
    const res = await request(app)
      .patch('/api/requests/req1/approve')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('returns 404 when request not found', async () => {
    prismaFindUniqueMock.mockResolvedValue(null);
    const token = makeToken('WAREHOUSE_OPERATOR');
    const res = await request(app)
      .patch('/api/requests/req1/approve')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(404);
  });

  it('returns 400 when request is not PENDING', async () => {
    prismaFindUniqueMock.mockResolvedValue({ id: 'req1', status: 'APPROVED', items: [] });
    const token = makeToken('WAREHOUSE_OPERATOR');
    const res = await request(app)
      .patch('/api/requests/req1/approve')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/requests/:id/cancel', () => {
  it('returns 403 for non-requester/admin role', async () => {
    const token = makeToken('WAREHOUSE_OPERATOR');
    const res = await request(app)
      .patch('/api/requests/req1/cancel')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('returns 404 when request not found', async () => {
    prismaFindUniqueMock.mockResolvedValue(null);
    const token = makeToken('REQUESTER');
    const res = await request(app)
      .patch('/api/requests/req1/cancel')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(404);
  });

  it('returns 403 when requester tries to cancel another user request', async () => {
    prismaFindUniqueMock.mockResolvedValue({ id: 'req1', requesterId: 'other', status: 'PENDING' });
    const token = makeToken('REQUESTER', 'user1');
    const res = await request(app)
      .patch('/api/requests/req1/cancel')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('returns 400 when request is not PENDING', async () => {
    prismaFindUniqueMock.mockResolvedValue({ id: 'req1', requesterId: 'user1', status: 'APPROVED' });
    const token = makeToken('REQUESTER', 'user1');
    const res = await request(app)
      .patch('/api/requests/req1/cancel')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
