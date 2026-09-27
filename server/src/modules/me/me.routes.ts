import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard.js';
import { getMySummaryHandler } from './me.controller.js';

export const meRouter = Router();
meRouter.use(authGuard);
meRouter.get('/summary', getMySummaryHandler);
