import cors from 'cors';
import express, { type Express } from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { activityRouter } from './modules/activity/activity.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { balancesRouter } from './modules/balances/balances.routes.js';
import { expenseRouter, expensesByGroupRouter } from './modules/expenses/expenses.routes.js';
import { friendsRouter } from './modules/friends/friends.routes.js';
import { groupsRouter } from './modules/groups/groups.routes.js';
import { exportRouter, insightsRouter } from './modules/insights/insights.routes.js';
import { meRouter } from './modules/me/me.routes.js';
import { recurringRouter } from './modules/recurring/recurring.routes.js';
import { settlementsRouter } from './modules/settlements/settlements.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
  app.use(express.json());

  app.use('/api/auth', authRouter);
  app.use('/api/friends', friendsRouter);
  app.use('/api/me', meRouter);
  app.use('/api/groups/:id/expenses', expensesByGroupRouter);
  app.use('/api/groups/:id/balances', balancesRouter);
  app.use('/api/groups/:id/settlements', settlementsRouter);
  app.use('/api/groups/:id/activity', activityRouter);
  app.use('/api/groups/:id/recurring', recurringRouter);
  app.use('/api/groups/:id/insights', insightsRouter);
  app.use('/api/groups/:id/export.csv', exportRouter);
  app.use('/api/groups', groupsRouter);
  app.use('/api/expenses', expenseRouter);

  app.use(errorHandler);

  return app;
}
