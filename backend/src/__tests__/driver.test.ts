import request from 'supertest';

// Mocks must be declared before any imports
jest.mock("../utils/prisma", () => ({
  __esModule: true,
  default: {
    deliveryOrder: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    routeUpdate: {
      create: jest.fn(),
    },
    occurrence: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../utils/cloudinary', () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue('https://cloudinary.example.com/test.jpg'),
}));

jest.mock('../utils/socket', () => ({
  initSocket: jest.fn(),
  getIO: jest.fn().mockReturnValue(null),
}));

import app from '../app';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';

// Get mock references via jest.requireMock
const prismaMocked = jest.requireMock('../utils/prisma') as {
  default: {
    deliveryOrder: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    routeUpdate: { create: jest.Mock };
    occurrence: { create: jest.Mock };
    $transaction: jest.Mock;
  };
};
const db = prismaMocked.default;

const driverToken = () =>
  generateAccessToken({ userId: 'driver-1', email: 'driver@test.com', role: 'DRIVER' });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Driver routes - authentication guards', () => {
  test('GET /api/driver/orders returns 401 without token', async () => {
    const res = await request(app).get('/api/driver/orders');
    expect(res.status).toBe(401);
  });

  test('GET /api/driver/orders returns 403 for ADMIN role', async () => {
    const token = generateAccessToken({ userId: 'admin-1', email: 'admin@test.com', role: 'ADMIN' });
    const res = await request(app).get('/api/driver/orders').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('GET /api/driver/orders returns 401 for refresh token', async () => {
    const refresh = generateRefreshToken({ userId: 'driver-1', email: 'driver@test.com', role: 'DRIVER' });
    const res = await request(app).get('/api/driver/orders').set('Authorization', `Bearer ${refresh}`);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/driver/orders', () => {
  test('returns 200 with orders array for DRIVER', async () => {
    db.deliveryOrder.findMany.mockResolvedValue([
      {
        id: 'order-1',
        driverId: 'driver-1',
        status: 'ASSIGNED',
        materialRequest: { school: { name: 'School A', lat: -10, lng: -50 }, requestItems: [] },
        vehicle: { plate: 'ABC-1234' },
        routeUpdates: [],
      },
    ]);

    const res = await request(app)
      .get('/api/driver/orders')
      .set('Authorization', `Bearer ${driverToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('orders');
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.orders).toHaveLength(1);
  });
});

describe('PATCH /api/driver/orders/:id/pickup', () => {
  test('returns 404 when order not found', async () => {
    db.deliveryOrder.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/driver/orders/nonexistent/pickup')
      .set('Authorization', `Bearer ${driverToken()}`);

    expect(res.status).toBe(404);
  });

  test('returns 400 when order is not ASSIGNED', async () => {
    db.deliveryOrder.findUnique.mockResolvedValue({ id: 'order-1', driverId: 'driver-1', status: 'IN_TRANSIT' });

    const res = await request(app)
      .patch('/api/driver/orders/order-1/pickup')
      .set('Authorization', `Bearer ${driverToken()}`);

    expect(res.status).toBe(400);
  });

  test('returns 200 and status PICKED_UP', async () => {
    db.deliveryOrder.findUnique.mockResolvedValue({ id: 'order-1', driverId: 'driver-1', status: 'ASSIGNED' });
    db.deliveryOrder.update.mockResolvedValue({ id: 'order-1', driverId: 'driver-1', status: 'PICKED_UP' });

    const res = await request(app)
      .patch('/api/driver/orders/order-1/pickup')
      .set('Authorization', `Bearer ${driverToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('PICKED_UP');
  });
});

describe('POST /api/driver/orders/:id/location', () => {
  test('returns 400 when lat/lng missing', async () => {
    const res = await request(app)
      .post('/api/driver/orders/order-1/location')
      .set('Authorization', `Bearer ${driverToken()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/lat and lng/i);
  });

  test('returns 404 when order not found', async () => {
    db.deliveryOrder.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/driver/orders/nonexistent/location')
      .set('Authorization', `Bearer ${driverToken()}`)
      .send({ lat: -10.0, lng: -50.0 });

    expect(res.status).toBe(404);
  });

  test('creates route update and returns 200', async () => {
    db.deliveryOrder.findUnique.mockResolvedValue({
      id: 'order-1',
      driverId: 'driver-1',
      status: 'PICKED_UP',
      materialRequest: { school: { lat: null, lng: null } },
    });
    db.routeUpdate.create.mockResolvedValue({
      id: 'route-1',
      deliveryOrderId: 'order-1',
      lat: -10.0,
      lng: -50.0,
      estimatedArrival: null,
    });
    db.deliveryOrder.update.mockResolvedValue({ status: 'IN_TRANSIT' });

    const res = await request(app)
      .post('/api/driver/orders/order-1/location')
      .set('Authorization', `Bearer ${driverToken()}`)
      .send({ lat: -10.0, lng: -50.0 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('routeUpdate');
  });
});

describe('POST /api/driver/orders/:id/occurrence', () => {
  test('returns 400 when description missing', async () => {
    const res = await request(app)
      .post('/api/driver/orders/order-1/occurrence')
      .set('Authorization', `Bearer ${driverToken()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/description/i);
  });

  test('creates occurrence and returns 201', async () => {
    db.deliveryOrder.findUnique.mockResolvedValue({ id: 'order-1', driverId: 'driver-1', status: 'IN_TRANSIT' });
    db.occurrence.create.mockResolvedValue({
      id: 'occ-1',
      deliveryOrderId: 'order-1',
      description: 'Road blocked',
      photoUrl: null,
    });

    const res = await request(app)
      .post('/api/driver/orders/order-1/occurrence')
      .set('Authorization', `Bearer ${driverToken()}`)
      .send({ description: 'Road blocked' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('occurrence');
    expect(res.body.occurrence.description).toBe('Road blocked');
  });
});

describe('POST /api/driver/orders/:id/deliver', () => {
  test('returns 400 when checklist missing', async () => {
    const res = await request(app)
      .post('/api/driver/orders/order-1/deliver')
      .set('Authorization', `Bearer ${driverToken()}`)
      .send({ signature: 'data:image/png;base64,abc123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/checklist/i);
  });

  test('returns 400 when signature missing', async () => {
    const res = await request(app)
      .post('/api/driver/orders/order-1/deliver')
      .set('Authorization', `Bearer ${driverToken()}`)
      .send({ checklist: [{ requestItemId: 'item-1', status: 'DELIVERED' }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/signature/i);
  });

  test('returns 404 when order not found', async () => {
    db.deliveryOrder.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/driver/orders/order-1/deliver')
      .set('Authorization', `Bearer ${driverToken()}`)
      .send({
        checklist: [{ requestItemId: 'item-1', status: 'DELIVERED' }],
        signature: 'data:image/png;base64,abc123',
      });

    expect(res.status).toBe(404);
  });

  test('confirms delivery and returns DELIVERED status', async () => {
    db.deliveryOrder.findUnique.mockResolvedValue({
      id: 'order-1',
      driverId: 'driver-1',
      materialRequestId: 'req-1',
      status: 'IN_TRANSIT',
      materialRequest: {
        requestItems: [{ id: 'item-1', productId: 'prod-1', quantity: 10 }],
      },
    });
    db.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({
        deliveryChecklist: { create: jest.fn() },
        requestItem: { update: jest.fn() },
        product: { update: jest.fn() },
        stockMovement: { create: jest.fn() },
        deliveryOrder: { update: jest.fn() },
        materialRequest: { update: jest.fn() },
      });
    });

    const res = await request(app)
      .post('/api/driver/orders/order-1/deliver')
      .set('Authorization', `Bearer ${driverToken()}`)
      .send({
        checklist: [{ requestItemId: 'item-1', status: 'DELIVERED' }],
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=',
        notes: 'All good',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'DELIVERED');
  });

  test('returns PARTIAL status when some items missing', async () => {
    db.deliveryOrder.findUnique.mockResolvedValue({
      id: 'order-2',
      driverId: 'driver-1',
      materialRequestId: 'req-2',
      status: 'IN_TRANSIT',
      materialRequest: {
        requestItems: [
          { id: 'item-1', productId: 'prod-1', quantity: 10 },
          { id: 'item-2', productId: 'prod-2', quantity: 5 },
        ],
      },
    });
    db.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({
        deliveryChecklist: { create: jest.fn() },
        requestItem: { update: jest.fn() },
        product: { update: jest.fn() },
        stockMovement: { create: jest.fn() },
        deliveryOrder: { update: jest.fn() },
        materialRequest: { update: jest.fn() },
      });
    });

    const res = await request(app)
      .post('/api/driver/orders/order-2/deliver')
      .set('Authorization', `Bearer ${driverToken()}`)
      .send({
        checklist: [
          { requestItemId: 'item-1', status: 'DELIVERED' },
          { requestItemId: 'item-2', status: 'MISSING' },
        ],
        signature: 'data:image/png;base64,abc123',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'PARTIAL');
  });
});
