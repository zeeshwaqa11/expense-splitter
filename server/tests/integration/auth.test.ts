import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, authed, registerUser, resetDb } from './helpers.js';

beforeEach(async () => {
  await resetDb();
});

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ali Khan',
      email: 'ali@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user.email).toBe('ali@test.com');
  });

  it('rejects a duplicate email with 409', async () => {
    await registerUser({ email: 'dup@test.com' });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Someone Else',
      email: 'dup@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects an invalid payload with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: '',
      email: 'not-an-email',
      password: '123',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await registerUser({ email: 'login@test.com', password: 'correcthorse' });
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.com',
      password: 'correcthorse',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf('string');
  });

  it('rejects an incorrect password with 401', async () => {
    await registerUser({ email: 'login2@test.com', password: 'correcthorse' });
    const res = await request(app).post('/api/auth/login').send({
      email: 'login2@test.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user when authenticated', async () => {
    const { token, user } = await registerUser({ email: 'me@test.com' });
    const res = await request(app).get('/api/auth/me').set(authed(token));

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it('rejects a missing token with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token with 401', async () => {
    const res = await request(app).get('/api/auth/me').set(authed('not-a-real-token'));
    expect(res.status).toBe(401);
  });
});
