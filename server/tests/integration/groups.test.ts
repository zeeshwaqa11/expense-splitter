import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, authed, registerUser, resetDb } from './helpers.js';

beforeEach(async () => {
  await resetDb();
});

describe('groups', () => {
  it('creates a group with the creator as a member', async () => {
    const owner = await registerUser({ email: 'owner@test.com' });
    const res = await request(app)
      .post('/api/groups')
      .set(authed(owner.token))
      .send({ name: 'Flatmates', type: 'HOME', currency: 'usd' });

    expect(res.status).toBe(201);
    expect(res.body.group.currency).toBe('USD');
    expect(res.body.group.members).toHaveLength(1);
    expect(res.body.group.members[0].userId).toBe(owner.user.id);
  });

  it('lists only the groups the user belongs to', async () => {
    const owner = await registerUser({ email: 'owner2@test.com' });
    const stranger = await registerUser({ email: 'stranger2@test.com' });

    await request(app)
      .post('/api/groups')
      .set(authed(owner.token))
      .send({ name: 'Trip', type: 'TRIP', currency: 'USD' });

    const ownerGroups = await request(app).get('/api/groups').set(authed(owner.token));
    expect(ownerGroups.body.groups).toHaveLength(1);

    const strangerGroups = await request(app).get('/api/groups').set(authed(stranger.token));
    expect(strangerGroups.body.groups).toHaveLength(0);
  });

  it('adds a member by email and lets them see the group', async () => {
    const owner = await registerUser({ email: 'owner3@test.com' });
    const friend = await registerUser({ email: 'friend3@test.com' });

    const createRes = await request(app)
      .post('/api/groups')
      .set(authed(owner.token))
      .send({ name: 'Office Lunch', type: 'OTHER', currency: 'USD' });
    const groupId = createRes.body.group.id;

    const addRes = await request(app)
      .post(`/api/groups/${groupId}/members`)
      .set(authed(owner.token))
      .send({ email: 'friend3@test.com' });
    expect(addRes.status).toBe(201);

    const friendView = await request(app)
      .get(`/api/groups/${groupId}`)
      .set(authed(friend.token));
    expect(friendView.status).toBe(200);
    expect(friendView.body.group.members).toHaveLength(2);
  });

  it('removes a member', async () => {
    const owner = await registerUser({ email: 'owner4@test.com' });
    const friend = await registerUser({ email: 'friend4@test.com' });

    const createRes = await request(app)
      .post('/api/groups')
      .set(authed(owner.token))
      .send({ name: 'Trip', type: 'TRIP', currency: 'USD' });
    const groupId = createRes.body.group.id;

    await request(app)
      .post(`/api/groups/${groupId}/members`)
      .set(authed(owner.token))
      .send({ email: 'friend4@test.com' });

    const removeRes = await request(app)
      .delete(`/api/groups/${groupId}/members/${friend.user.id}`)
      .set(authed(owner.token));
    expect(removeRes.status).toBe(204);

    const view = await request(app).get(`/api/groups/${groupId}`).set(authed(owner.token));
    expect(view.body.group.members).toHaveLength(1);
  });

  it('returns 404 for a non-member trying to view a group', async () => {
    const owner = await registerUser({ email: 'owner5@test.com' });
    const outsider = await registerUser({ email: 'outsider5@test.com' });

    const createRes = await request(app)
      .post('/api/groups')
      .set(authed(owner.token))
      .send({ name: 'Private Group', type: 'OTHER', currency: 'USD' });
    const groupId = createRes.body.group.id;

    const res = await request(app).get(`/api/groups/${groupId}`).set(authed(outsider.token));
    expect(res.status).toBe(404);
  });

  it('returns 404 for a non-member trying to add a member', async () => {
    const owner = await registerUser({ email: 'owner6@test.com' });
    const outsider = await registerUser({ email: 'outsider6@test.com' });
    await registerUser({ email: 'target6@test.com' });

    const createRes = await request(app)
      .post('/api/groups')
      .set(authed(owner.token))
      .send({ name: 'Private Group', type: 'OTHER', currency: 'USD' });
    const groupId = createRes.body.group.id;

    const res = await request(app)
      .post(`/api/groups/${groupId}/members`)
      .set(authed(outsider.token))
      .send({ email: 'target6@test.com' });
    expect(res.status).toBe(404);
  });
});
