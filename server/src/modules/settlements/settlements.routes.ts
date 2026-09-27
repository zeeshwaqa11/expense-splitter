import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard.js';
import { createSettlementHandler, listSettlementsHandler } from './settlements.controller.js';

export const settlementsRouter = Router({ mergeParams: true });
settlementsRouter.use(authGuard);
settlementsRouter.post('/', createSettlementHandler);
settlementsRouter.get('/', listSettlementsHandler);
