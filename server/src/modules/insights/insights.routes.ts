import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard.js';
import { exportCsvHandler, getInsightsHandler } from './insights.controller.js';

export const insightsRouter = Router({ mergeParams: true });
insightsRouter.use(authGuard);
insightsRouter.get('/', getInsightsHandler);

export const exportRouter = Router({ mergeParams: true });
exportRouter.use(authGuard);
exportRouter.get('/', exportCsvHandler);
