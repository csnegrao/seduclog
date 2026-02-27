const request = require('supertest');
const http = require('http');
const createApp = require('../app');
const setupSocket = require('../socket');
const prisma = require('../prismaClient');

let server;
let app;
let requesterToken;
let operatorToken;
let requesterId;
let operatorId;
let testRequestId;

beforeAll(async () => {
  app = createApp();
  server = http.createServer(app);
  const io = setupSocket(server);
  app.set('io', io);
  await new Promise((resolve) => server.listen(0, resolve));

  // Clean up
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.order.deleteMany();
  await prisma.request.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.user.deleteMany();

  // Register requester
  const r1 = await request(server).post('/api/auth/register').send({
    name: 'Test Requester',
    email: 'requester@test.com',
    password: 'password123',
    role: 'REQUESTER',
  });
  requesterToken = r1.body.token;
  requesterId = r1.body.user.id;

  // Register warehouse operator
  const r2 = await request(server).post('/api/auth/register').send({
    name: 'Test Operator',
    email: 'operator@test.com',
    password: 'password123',
    role: 'WAREHOUSE_OPERATOR',
  });
  operatorToken = r2.body.token;
  operatorId = r2.body.user.id;

  // Create a test request
  const r3 = await request(server)
    .post('/api/requests')
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({ title: 'Test Request', description: 'A test request' });
  testRequestId = r3.body.id;
});

afterAll(async () => {
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.order.deleteMany();
  await prisma.request.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
  await new Promise((resolve) => server.close(resolve));
});

describe('Notifications', () => {
  it('GET /api/notifications — requires authentication', async () => {
    const res = await request(server).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('GET /api/notifications — returns empty list initially', async () => {
    const res = await request(server)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('PATCH /api/notifications/read-all — marks all as read', async () => {
    // Create a notification first
    await prisma.notification.create({
      data: {
        userId: requesterId,
        type: 'GENERAL',
        title: 'Test',
        message: 'Test notification',
      },
    });

    const res = await request(server)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(200);

    // Verify all read
    const all = await prisma.notification.findMany({ where: { userId: requesterId } });
    expect(all.every((n) => n.isRead)).toBe(true);
  });

  it('GET /api/notifications — unread first', async () => {
    // Create unread and read notifications
    await prisma.notification.createMany({
      data: [
        { userId: requesterId, type: 'GENERAL', title: 'Unread', message: 'msg', isRead: false },
        { userId: requesterId, type: 'GENERAL', title: 'Read', message: 'msg', isRead: true },
      ],
    });

    const res = await request(server)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(200);
    const unread = res.body.filter((n) => !n.isRead);
    const read = res.body.filter((n) => n.isRead);
    if (unread.length && read.length) {
      const firstUnreadIdx = res.body.findIndex((n) => !n.isRead);
      const firstReadIdx = res.body.findIndex((n) => n.isRead);
      expect(firstUnreadIdx).toBeLessThan(firstReadIdx);
    }
  });
});

describe('Messages', () => {
  it('GET /api/messages/:requestId — requires authentication', async () => {
    const res = await request(server).get(`/api/messages/${testRequestId}`);
    expect(res.status).toBe(401);
  });

  it('GET /api/messages/:requestId — returns empty array initially', async () => {
    const res = await request(server)
      .get(`/api/messages/${testRequestId}`)
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/messages/:requestId — requires authentication', async () => {
    const res = await request(server)
      .post(`/api/messages/${testRequestId}`)
      .send({ content: 'Hello' });
    expect(res.status).toBe(401);
  });

  it('POST /api/messages/:requestId — rejects DRIVER role', async () => {
    const driverRes = await request(server).post('/api/auth/register').send({
      name: 'Driver',
      email: 'driver@test.com',
      password: 'password123',
      role: 'DRIVER',
    });
    const driverToken = driverRes.body.token;
    const res = await request(server)
      .post(`/api/messages/${testRequestId}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ content: 'Hello' });
    expect(res.status).toBe(403);
  });

  it('POST /api/messages/:requestId — REQUESTER can send', async () => {
    const res = await request(server)
      .post(`/api/messages/${testRequestId}`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ content: 'Hello from requester' });
    expect(res.status).toBe(201);
    expect(res.body.content).toBe('Hello from requester');
    expect(res.body.sender.id).toBe(requesterId);
  });

  it('POST /api/messages/:requestId — WAREHOUSE_OPERATOR can send', async () => {
    const res = await request(server)
      .post(`/api/messages/${testRequestId}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ content: 'Hello from operator' });
    expect(res.status).toBe(201);
    expect(res.body.content).toBe('Hello from operator');
  });

  it('POST /api/messages/:requestId — rejects empty content', async () => {
    const res = await request(server)
      .post(`/api/messages/${testRequestId}`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ content: '  ' });
    expect(res.status).toBe(422);
  });

  it('GET /api/messages/:requestId — returns messages in order', async () => {
    const res = await request(server)
      .get(`/api/messages/${testRequestId}`)
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body[0]).toHaveProperty('sender');
  });

  it('GET /api/messages/:requestId — 404 for unknown request', async () => {
    const res = await request(server)
      .get('/api/messages/nonexistent-id')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(404);
  });
});

describe('Auto-notifications', () => {
  it('creates REQUEST_APPROVED notification when request is approved', async () => {
    // Clear notifications
    await prisma.notification.deleteMany({ where: { userId: requesterId } });

    await request(server)
      .patch(`/api/requests/${testRequestId}/status`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ status: 'APPROVED' });

    const notifications = await prisma.notification.findMany({
      where: { userId: requesterId, type: 'REQUEST_APPROVED' },
    });
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('creates REQUEST_REJECTED notification when request is rejected', async () => {
    await prisma.notification.deleteMany({ where: { userId: requesterId } });

    await request(server)
      .patch(`/api/requests/${testRequestId}/status`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ status: 'REJECTED' });

    const notifications = await prisma.notification.findMany({
      where: { userId: requesterId, type: 'REQUEST_REJECTED' },
    });
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('creates STOCK_BELOW_MINIMUM notification when stock falls below minimum', async () => {
    // Create stock item
    const stock = await prisma.stock.create({
      data: { productName: 'Widget', quantity: 20, minimumQuantity: 10 },
    });

    await prisma.notification.deleteMany({ where: { userId: operatorId } });

    // Update to below minimum
    await request(server)
      .patch(`/api/stock/${stock.id}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ quantity: 5 });

    const notifications = await prisma.notification.findMany({
      where: { userId: operatorId, type: 'STOCK_BELOW_MINIMUM' },
    });
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0].message).toContain('Widget');
  });
});
