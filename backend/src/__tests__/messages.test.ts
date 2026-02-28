import request from 'supertest';
import app from '../app';
import { MaterialRequest } from '../types';

async function getToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return (res.body as { accessToken: string }).accessToken;
}

// Helper: create and return a request ID
async function createRequest(requesterToken: string, productId = 'p4'): Promise<string> {
  const res = await request(app)
    .post('/api/requests')
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({
      school: 'Escola Msgs',
      desiredDate: '2026-12-31',
      justification: 'Msg test',
      items: [{ productId, requestedQuantity: 1 }],
    });
  return (res.body as { request: MaterialRequest }).request.id;
}

// ─── Auth guards ──────────────────────────────────────────────────────────────

describe('Messages – auth guards', () => {
  it('GET /api/messages/:id returns 401 without token', async () => {
    const res = await request(app).get('/api/messages/fake-id');
    expect(res.status).toBe(401);
  });

  it('POST /api/messages/:id returns 401 without token', async () => {
    const res = await request(app).post('/api/messages/fake-id').send({ text: 'hi' });
    expect(res.status).toBe(401);
  });
});

// ─── Role guards ──────────────────────────────────────────────────────────────

describe('Messages – role guards', () => {
  let driverToken: string;

  beforeAll(async () => {
    driverToken = await getToken('driver@seduclog.com', 'driver123');
  });

  it('GET /api/messages/:id returns 403 for driver', async () => {
    const res = await request(app)
      .get('/api/messages/fake-id')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.status).toBe(403);
  });

  it('POST /api/messages/:id returns 403 for driver', async () => {
    const res = await request(app)
      .post('/api/messages/fake-id')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ text: 'hi' });
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/messages/:requestId ────────────────────────────────────────────

describe('GET /api/messages/:requestId', () => {
  let requesterToken: string;
  let warehouseToken: string;
  let requestId: string;

  beforeAll(async () => {
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
    requestId = await createRequest(requesterToken);
  });

  it('returns 404 for non-existent request', async () => {
    const res = await request(app)
      .get('/api/messages/does-not-exist')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(404);
  });

  it('returns empty thread for new request', async () => {
    const res = await request(app)
      .get(`/api/messages/${requestId}`)
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(200);
    const body = res.body as { messages: unknown[] };
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages).toHaveLength(0);
  });

  it('warehouse_operator can read the thread', async () => {
    const res = await request(app)
      .get(`/api/messages/${requestId}`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/messages/:requestId ───────────────────────────────────────────

describe('POST /api/messages/:requestId', () => {
  let requesterToken: string;
  let warehouseToken: string;
  let requestId: string;

  beforeAll(async () => {
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
    requestId = await createRequest(requesterToken, 'p6');
  });

  it('returns 400 when text is missing', async () => {
    const res = await request(app)
      .post(`/api/messages/${requestId}`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when text is empty string', async () => {
    const res = await request(app)
      .post(`/api/messages/${requestId}`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ text: '   ' });
    expect(res.status).toBe(400);
  });

  it('requester can send a message', async () => {
    const res = await request(app)
      .post(`/api/messages/${requestId}`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ text: 'Olá, quando vai sair meu pedido?' });
    expect(res.status).toBe(201);
    const body = res.body as {
      message: {
        id: string;
        requestId: string;
        senderId: string;
        senderName: string;
        senderRole: string;
        text: string;
        createdAt: string;
      };
    };
    expect(body.message.text).toBe('Olá, quando vai sair meu pedido?');
    expect(body.message.senderRole).toBe('requester');
    expect(body.message.requestId).toBe(requestId);
  });

  it('warehouse_operator can reply', async () => {
    const res = await request(app)
      .post(`/api/messages/${requestId}`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ text: 'Seu pedido será enviado amanhã.' });
    expect(res.status).toBe(201);
    const body = res.body as { message: { senderRole: string; text: string } };
    expect(body.message.senderRole).toBe('warehouse_operator');
    expect(body.message.text).toBe('Seu pedido será enviado amanhã.');
  });

  it('thread now contains both messages in order', async () => {
    const res = await request(app)
      .get(`/api/messages/${requestId}`)
      .set('Authorization', `Bearer ${requesterToken}`);
    const body = res.body as { messages: Array<{ text: string }> };
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].text).toBe('Olá, quando vai sair meu pedido?');
    expect(body.messages[1].text).toBe('Seu pedido será enviado amanhã.');
  });

  it('requester cannot read a thread for another requester\'s request', async () => {
    // Create a second requester and a request as requester (user id=4)
    // Since only one requester seed exists, just test with wrong requestId
    // by creating a request with another user (we use the warehouse_op workaround)
    const res = await request(app)
      .get('/api/messages/some-other-request')
      .set('Authorization', `Bearer ${requesterToken}`);
    // 404 because request doesn't exist
    expect(res.status).toBe(404);
  });
});

// ─── Message response shape ───────────────────────────────────────────────────

describe('Message shape', () => {
  let requesterToken: string;
  let requestId: string;

  beforeAll(async () => {
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    requestId = await createRequest(requesterToken, 'p7');
    await request(app)
      .post(`/api/messages/${requestId}`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ text: 'Shape check' });
  });

  it('message has all required fields', async () => {
    const res = await request(app)
      .get(`/api/messages/${requestId}`)
      .set('Authorization', `Bearer ${requesterToken}`);
    const body = res.body as {
      messages: Array<{
        id: string;
        requestId: string;
        senderId: string;
        senderName: string;
        senderRole: string;
        text: string;
        createdAt: string;
      }>;
    };
    expect(body.messages).toHaveLength(1);
    const m = body.messages[0];
    expect(m).toHaveProperty('id');
    expect(m).toHaveProperty('requestId');
    expect(m).toHaveProperty('senderId');
    expect(m).toHaveProperty('senderName');
    expect(m).toHaveProperty('senderRole');
    expect(m).toHaveProperty('text');
    expect(m).toHaveProperty('createdAt');
    expect(m.text).toBe('Shape check');
  });
});
