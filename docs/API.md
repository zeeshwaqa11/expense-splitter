# API Reference

Base URL: `http://localhost:5000/api`

All endpoints except `POST /auth/register` and `POST /auth/login` require an
`Authorization: Bearer <token>` header. Endpoints under `/groups/:id/...` and
`/expenses/:id...` additionally require the caller to be a **member of that
group** (or, for an expense, a member of the group it belongs to) — a
non-member gets `404 Not Found` rather than `403`, so a group's existence is
never leaked to outsiders.

Every error response has the same shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

`code` is one of `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN`
(403), `NOT_FOUND` (404), `CONFLICT` (409), `UNPROCESSABLE` (422), or
`INTERNAL_ERROR` (500).

---

## Auth

### `POST /auth/register`
Public. Creates a user and returns a token.

Request:
```json
{ "name": "Ali Khan", "email": "ali@example.com", "password": "password123" }
```
Response `201`:
```json
{ "token": "eyJ...", "user": { "id": "c1", "name": "Ali Khan", "email": "ali@example.com" } }
```

### `POST /auth/login`
Public.

Request: `{ "email": "ali@example.com", "password": "password123" }`
Response `200`: same shape as register.

### `GET /auth/me`
Auth required. Response `200`: `{ "user": { "id", "name", "email" } }`

---

## Friends

### `GET /friends`
Auth required. Response `200`: `{ "friends": [{ "id", "name", "email" }] }`

### `POST /friends`
Auth required. Adds a registered user as a friend by email (bidirectional).

Request: `{ "email": "sara@example.com" }`
Response `201`: `{ "friend": { "id", "name", "email" } }`

### `DELETE /friends/:friendId`
Auth required. Response `204`.

---

## Groups

### `POST /groups`
Auth required. Creator is automatically added as a member.

Request:
```json
{ "name": "Flatmates", "type": "HOME", "currency": "USD", "memberIds": ["u2", "u3"] }
```
Response `201`: `{ "group": { "id", "name", "type", "currency", "members": [...] } }`

### `GET /groups`
Auth required. Response `200`: `{ "groups": [...] }` — only groups the caller belongs to.

### `GET /groups/:id`
Group member. Response `200`: `{ "group": { ..., "members": [{ "userId", "user": {...} }] } }`

### `PATCH /groups/:id`
Group member. Request: `{ "name"?, "type"? }`. Response `200`: `{ "group": {...} }`

### `POST /groups/:id/members`
Group member. Adds a member by `userId` or `email`.

Request: `{ "email": "bilal@example.com" }`
Response `201`: `{ "member": { "id", "name", "email" } }`

### `DELETE /groups/:id/members/:userId`
Group member. Fails `422 UNPROCESSABLE` if the member's balance is non-zero. Response `204`.

---

## Expenses

### `POST /groups/:id/expenses`
Group member. Money is always in integer cents.

Request:
```json
{
  "description": "Dinner",
  "totalCents": 10000,
  "category": "FOOD",
  "date": "2026-01-15",
  "notes": "optional",
  "payers": [{ "userId": "u1", "amountCents": 6000 }, { "userId": "u2", "amountCents": 4000 }],
  "split": { "splitType": "EQUAL", "memberIds": ["u1", "u2", "u3"] }
}
```
`split.splitType` is one of:
- `EQUAL` — `{ memberIds: string[] }`
- `EXACT` — `{ amounts: Record<userId, cents> }`, must sum to `totalCents`
- `PERCENTAGE` — `{ percentages: Record<userId, number> }`, must sum to 100
- `SHARES` — `{ shares: Record<userId, number> }`

Response `201`: `{ "expense": { ..., "payers": [...], "splits": [...] } }`

### `GET /groups/:id/expenses`
Group member. Response `200`: `{ "expenses": [...] }` (excludes soft-deleted).

### `GET /expenses/:id`
Group member. Response `200`: `{ "expense": {...} }`

### `PUT /expenses/:id`
Group member. Same body as create. Records a revision snapshot of the
previous state before applying the update. Response `200`: `{ "expense": {...} }`

### `DELETE /expenses/:id`
Group member. Soft delete. Response `204`.

### `POST /expenses/:id/restore`
Group member. Response `200`: `{ "restored": true }`

### `GET /expenses/:id/history`
Group member. Response `200`: `{ "history": [{ "id", "editorName", "snapshot", "createdAt" }] }`

---

## Balances & settlements

### `GET /groups/:id/balances?simplify=true|false`
Group member. `simplify=true` runs the greedy debt-simplification algorithm;
omit or `false` for raw pairwise debts.

Response `200`:
```json
{
  "balances": [{ "userId", "name", "amountCents" }],
  "payments": [{ "fromUserId", "fromName", "toUserId", "toName", "amountCents" }],
  "simplified": true
}
```

### `POST /groups/:id/settlements`
Group member. Records a payment between two members of the group.

Request: `{ "fromUserId": "u2", "toUserId": "u1", "amountCents": 1000, "date": "2026-01-20" }`
Response `201`: `{ "settlement": {...} }`

### `GET /groups/:id/settlements`
Group member. Response `200`: `{ "settlements": [...] }`

---

## Activity

### `GET /groups/:id/activity`
Group member. Response `200`: `{ "activity": [{ "id", "type", "actorName", "payload", "createdAt" }] }` (latest 100).

---

## Recurring expenses

### `POST /groups/:id/recurring`
Group member.

Request:
```json
{
  "frequency": "MONTHLY",
  "dayOfPeriod": 1,
  "template": { "description": "Rent", "totalCents": 200000, "category": "RENT", "payers": [...], "split": {...} }
}
```
`dayOfPeriod` is 1–31 for `MONTHLY`, 0 (Sunday)–6 (Saturday) for `WEEKLY`.
Response `201`: `{ "recurring": {...} }`

### `GET /groups/:id/recurring`
Group member. Response `200`: `{ "recurring": [...] }`

### `PATCH /groups/:id/recurring/:recurringId`
Group member. Same body as create. Response `200`: `{ "recurring": {...} }`

### `DELETE /groups/:id/recurring/:recurringId`
Group member. Response `204`.

A node-cron job runs daily and materializes any recurring rule whose
`nextRunDate` has passed into a real expense, then advances `nextRunDate` —
see `server/src/jobs/recurringExpenses.job.ts` and
`server/src/modules/recurring/recurring.service.ts`.

---

## Insights & export

### `GET /groups/:id/insights`
Group member. Response `200`:
```json
{
  "spendingByCategory": [{ "month": "2026-01", "category": "FOOD", "totalCents": 12000 }],
  "memberInsights": [{ "userId", "name", "totalPaidCents", "totalShareCents" }]
}
```

### `GET /groups/:id/export.csv`
Group member. Returns `text/csv` with one row per expense and settlement.

---

## Me

### `GET /me/summary`
Auth required. Response `200`:
```json
{
  "overallNetCents": 15000,
  "groups": [{ "groupId", "groupName", "netCents" }],
  "recentActivity": [{ "id", "groupId", "groupName", "type", "actorName", "payload", "createdAt" }]
}
```
