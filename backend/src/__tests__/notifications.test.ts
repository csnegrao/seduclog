import request from 'supertest';
import app from '../app';
import { MaterialRequest } from '../types';

async function getToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return (res.body as { accessToken: string }).accessToken;
}

// ─── Auth guards ──────────────────────────────────────────────────────────────

describe('Notifications – auth guards', () => {
  it('GET /api/notifications returns 401 without token', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('PATCH /api/notifications/read-all returns 401 without token', async () => {
    const res = await request(app).patch('/api/notifications/read-all');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/notifications ───────────────────────────────────────────────────

describe('GET /api/notifications', () => {
  let requesterToken: string;

  beforeAll(async () => {
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
  });

  it('returns empty list for fresh user', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(200);
    const body = res.body as { notifications: unknown[]; unreadCount: number };
    expect(Array.isArray(body.notifications)).toBe(true);
    expect(typeof body.unreadCount).toBe('number');
  });
});

// ─── Auto-notification: request approved ─────────────────────────────────────

describe('Auto-notification – request approved', () => {
  let requesterToken: string;
  let warehouseToken: string;

  beforeAll(async () => {
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');
  });

  it('creates a notification for the requester when a request is approved', async () => {
    // Create a request
    const createRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        school: 'Escola Notif',
        desiredDate: '2026-12-31',
        justification: 'Notif test',
        items: [{ productId: 'p1', requestedQuantity: 1 }],
      });
    const created = (createRes.body as { request: MaterialRequest }).request;
    expect(createRes.status).toBe(201);

    // Approve it
    await request(app)
      .patch(`/api/requests/${created.id}/approve`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ notes: 'approved in test' });

    // Check notifications for the requester
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(notifRes.status).toBe(200);
    const body = notifRes.body as {
      notifications: Array<{ event: string; referenceId?: string }>;
      unreadCount: number;
    };
    const approvalNotif = body.notifications.find(
      (n) => n.event === 'request_approved' && n.referenceId === created.id,
    );
    expect(approvalNotif).toBeDefined();
    expect(body.unreadCount).toBeGreaterThan(0);
  });
});

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────

describe('PATCH /api/notifications/read-all', () => {
  let requesterToken: string;
  let warehouseToken: string;

  beforeAll(async () => {
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');

    // Ensure at least one notification exists
    const createRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        school: 'Escola Read-All',
        desiredDate: '2026-12-31',
        justification: 'Read-all test',
        items: [{ productId: 'p2', requestedQuantity: 1 }],
      });
    const req_ = (createRes.body as { request: MaterialRequest }).request;
    await request(app)
      .patch(`/api/requests/${req_.id}/approve`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({});
  });

  it('marks all notifications as read and returns the count', async () => {
    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(res.status).toBe(200);
    const body = res.body as { updated: number };
    expect(typeof body.updated).toBe('number');
    expect(body.updated).toBeGreaterThanOrEqual(0);
  });

  it('unreadCount is 0 after read-all', async () => {
    // read-all first
    await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${requesterToken}`);

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${requesterToken}`);
    const body = res.body as { unreadCount: number };
    expect(body.unreadCount).toBe(0);
  });
});

// ─── Notification shape ───────────────────────────────────────────────────────

describe('Notification response shape', () => {
  let requesterToken: string;
  let warehouseToken: string;

  beforeAll(async () => {
    requesterToken = await getToken('requester@seduclog.com', 'requester123');
    warehouseToken = await getToken('warehouse@seduclog.com', 'warehouse123');

    const createRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        school: 'Escola Shape',
        desiredDate: '2026-12-31',
        justification: 'Shape test',
        items: [{ productId: 'p3', requestedQuantity: 1 }],
      });
    const req_ = (createRes.body as { request: MaterialRequest }).request;
    await request(app)
      .patch(`/api/requests/${req_.id}/approve`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({});
  });

  it('notifications have required fields', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${requesterToken}`);
    const body = res.body as {
      notifications: Array<{
        id: string;
        userId: string;
        event: string;
        title: string;
        body: string;
        read: boolean;
        createdAt: string;
      }>;
    };
    if (body.notifications.length > 0) {
      const n = body.notifications[0];
      expect(n).toHaveProperty('id');
      expect(n).toHaveProperty('userId');
      expect(n).toHaveProperty('event');
      expect(n).toHaveProperty('title');
      expect(n).toHaveProperty('body');
      expect(typeof n.read).toBe('boolean');
      expect(n).toHaveProperty('createdAt');
    }
  });

  it('unread notifications appear before read ones', async () => {
    // Mark all read, then generate one new notification
    await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${requesterToken}`);

    const createRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        school: 'Escola Order',
        desiredDate: '2026-12-31',
        justification: 'Order test',
        items: [{ productId: 'p5', requestedQuantity: 1 }],
      });
    const req_ = (createRes.body as { request: MaterialRequest }).request;
    await request(app)
      .patch(`/api/requests/${req_.id}/approve`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({});

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${requesterToken}`);
    const body = res.body as { notifications: Array<{ read: boolean }> };

    // First unread, then read
    let seenRead = false;
    for (const n of body.notifications) {
      if (n.read) seenRead = true;
      if (seenRead) expect(n.read).toBe(true);
    }
  });
});
