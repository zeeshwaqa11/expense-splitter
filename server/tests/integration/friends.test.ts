import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, authed, registerUser, resetDb } from './helpers.js';

beforeEach(async () => {
  await resetDb();
});

describe('friends', () => {
  it('adds a friend by email and lists them both ways', async () => {
    const alice = await registerUser({ email: 'alice@test.com' });
    const bob = await registerUser({ email: 'bob@test.com' });

    const addRes = await request(app)
      .post('/api/friends')
      .set(authed(alice.token))
      .send({ email: 'bob@test.com' });
    expect(addRes.status).toBe(201);
    expect(addRes.body.friend.email).toBe('bob@test.com');

    const aliceFriends = await request(app).get('/api/friends').set(authed(alice.token));
    expect(aliceFriends.body.friends.map((f: { email: string }) => f.email)).toContain(
      'bob@test.com',
    );

    const bobFriends = await request(app).get('/api/friends').set(authed(bob.token));
    expect(bobFriends.body.friends.map((f: { email: string }) => f.email)).toContain(
      'alice@test.com',
    );
  });

  it('rejects adding an unknown email with 404', async () => {
    const alice = await registerUser({ email: 'alice2@test.com' });
    const res = await request(app)
      .post('/api/friends')
      .set(authed(alice.token))
      .send({ email: 'nobody@test.com' });
    expect(res.status).toBe(404);
  });

  it('rejects adding yourself with 422', async () => {
    const alice = await registerUser({ email: 'alice3@test.com' });
    const res = await request(app)
      .post('/api/friends')
      .set(authed(alice.token))
      .send({ email: 'alice3@test.com' });
    expect(res.status).toBe(422);
  });

  it('rejects adding the same friend twice with 422', async () => {
    const alice = await registerUser({ email: 'alice4@test.com' });
    await registerUser({ email: 'bob4@test.com' });
    await request(app).post('/api/friends').set(authed(alice.token)).send({ email: 'bob4@test.com' });
    const res = await request(app)
      .post('/api/friends')
      .set(authed(alice.token))
      .send({ email: 'bob4@test.com' });
    expect(res.status).toBe(422);
  });

  it('removes a friend for both users', async () => {
    const alice = await registerUser({ email: 'alice5@test.com' });
    const bob = await registerUser({ email: 'bob5@test.com' });
    await request(app).post('/api/friends').set(authed(alice.token)).send({ email: 'bob5@test.com' });

    const del = await request(app)
      .delete(`/api/friends/${bob.user.id}`)
      .set(authed(alice.token));
    expect(del.status).toBe(204);

    const aliceFriends = await request(app).get('/api/friends').set(authed(alice.token));
    expect(aliceFriends.body.friends).toEqual([]);

    const bobFriends = await request(app).get('/api/friends').set(authed(bob.token));
    expect(bobFriends.body.friends).toEqual([]);
  });
});
