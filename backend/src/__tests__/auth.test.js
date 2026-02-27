const request = require('supertest');
const http = require('http');
const createApp = require('../app');
const setupSocket = require('../socket');
const prisma = require('../prismaClient');

let server;
let app;

beforeAll(async () => {
  app = createApp();
  server = http.createServer(app);
  const io = setupSocket(server);
  app.set('io', io);
  await new Promise((resolve) => server.listen(0, resolve));

  // Clean up auth-related tables before tests
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.order.deleteMany();
  await prisma.request.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.order.deleteMany();
  await prisma.request.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
  await new Promise((resolve) => server.close(resolve));
});

describe('Authentication — POST /api/auth/register', () => {
  it('registers a new user and returns token + user', async () => {
    const res = await request(server).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'securepass',
      role: 'REQUESTER',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({
      name: 'Alice',
      email: 'alice@example.com',
      role: 'REQUESTER',
    });
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('defaults role to REQUESTER when not provided', async () => {
    const res = await request(server).post('/api/auth/register').send({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'securepass',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('REQUESTER');
  });

  it('rejects duplicate email with 409', async () => {
    await request(server).post('/api/auth/register').send({
      name: 'Carol',
      email: 'carol@example.com',
      password: 'securepass',
    });
    const res = await request(server).post('/api/auth/register').send({
      name: 'Carol 2',
      email: 'carol@example.com',
      password: 'securepass',
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/email already in use/i);
  });

  it('rejects invalid email with 422', async () => {
    const res = await request(server).post('/api/auth/register').send({
      name: 'Dave',
      email: 'not-an-email',
      password: 'securepass',
    });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('details');
  });

  it('rejects password shorter than 8 characters with 422', async () => {
    const res = await request(server).post('/api/auth/register').send({
      name: 'Eve',
      email: 'eve@example.com',
      password: 'short',
    });
    expect(res.status).toBe(422);
  });

  it('rejects missing name with 422', async () => {
    const res = await request(server).post('/api/auth/register').send({
      email: 'noname@example.com',
      password: 'securepass',
    });
    expect(res.status).toBe(422);
  });

  it('rejects invalid role with 422', async () => {
    const res = await request(server).post('/api/auth/register').send({
      name: 'Frank',
      email: 'frank@example.com',
      password: 'securepass',
      role: 'SUPERADMIN',
    });
    expect(res.status).toBe(422);
  });
});

describe('Authentication — POST /api/auth/login', () => {
  beforeAll(async () => {
    await request(server).post('/api/auth/register').send({
      name: 'Login User',
      email: 'login@example.com',
      password: 'mypassword123',
    });
  });

  it('logs in with correct credentials and returns token', async () => {
    const res = await request(server).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'mypassword123',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('login@example.com');
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(server).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(server).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'anypassword',
    });
    expect(res.status).toBe(401);
  });

  it('rejects invalid email format with 422', async () => {
    const res = await request(server).post('/api/auth/login').send({
      email: 'not-an-email',
      password: 'anypassword',
    });
    expect(res.status).toBe(422);
  });

  it('rejects missing password with 422', async () => {
    const res = await request(server).post('/api/auth/login').send({
      email: 'login@example.com',
    });
    expect(res.status).toBe(422);
  });
});

describe('Request Creation — POST /api/requests', () => {
  let requesterToken;
  let operatorToken;

  beforeAll(async () => {
    const r1 = await request(server).post('/api/auth/register').send({
      name: 'Requester',
      email: 'req@example.com',
      password: 'securepass',
      role: 'REQUESTER',
    });
    requesterToken = r1.body.token;

    const r2 = await request(server).post('/api/auth/register').send({
      name: 'Operator',
      email: 'op@example.com',
      password: 'securepass',
      role: 'WAREHOUSE_OPERATOR',
    });
    operatorToken = r2.body.token;
  });

  it('creates a request with title and description', async () => {
    const res = await request(server)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ title: 'Need supplies', description: 'ASAP please' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Need supplies');
    expect(res.body.description).toBe('ASAP please');
    expect(res.body.status).toBe('PENDING');
  });

  it('creates a request with only title (description defaults to empty string)', async () => {
    const res = await request(server)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ title: 'Minimal request' });
    expect(res.status).toBe(201);
    expect(res.body.description).toBe('');
  });

  it('requires authentication', async () => {
    const res = await request(server)
      .post('/api/requests')
      .send({ title: 'No auth' });
    expect(res.status).toBe(401);
  });

  it('rejects missing title with 422', async () => {
    const res = await request(server)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ description: 'No title' });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('details');
  });

  it('rejects empty title with 422', async () => {
    const res = await request(server)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ title: '' });
    expect(res.status).toBe(422);
  });

  it('rejects WAREHOUSE_OPERATOR creating a request with 403', async () => {
    const res = await request(server)
      .post('/api/requests')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ title: 'Operator request' });
    expect(res.status).toBe(403);
  });

  it('GET /api/requests — returns only own requests for REQUESTER', async () => {
    const res = await request(server)
      .get('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((r) => {
      expect(r).toHaveProperty('_count');
    });
  });
});
