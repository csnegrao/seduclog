import request from 'supertest';
import app from '../app';

describe('POST /api/auth/login', () => {
  it('returns 422 when body is empty', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(422);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@nowhere.com', password: 'secret' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@seduclog.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('returns tokens and user on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@seduclog.com', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toMatchObject({
      email: 'admin@seduclog.com',
      role: 'admin',
    });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns 422 when refreshToken is missing', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(422);
  });

  it('returns 401 for an invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'bad.token.here' });
    expect(res.status).toBe(401);
  });

  it('returns new tokens when refresh token is valid', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'manager@seduclog.com', password: 'manager123' });

    const { refreshToken } = loginRes.body as { refreshToken: string };

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toHaveProperty('accessToken');
    expect(refreshRes.body).toHaveProperty('refreshToken');
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 for malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer bad.token');
    expect(res.status).toBe(401);
  });

  it('returns user data for a valid access token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'driver@seduclog.com', password: 'driver123' });

    const { accessToken } = loginRes.body as { accessToken: string };

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user).toMatchObject({
      email: 'driver@seduclog.com',
      role: 'driver',
    });
  });
});
