import cors from 'cors';
import express, { type Express } from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { friendsRouter } from './modules/friends/friends.routes.js';
import { groupsRouter } from './modules/groups/groups.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
  app.use(express.json());

  app.use('/api/auth', authRouter);
  app.use('/api/friends', friendsRouter);
  app.use('/api/groups', groupsRouter);

  app.use(errorHandler);

  return app;
}
