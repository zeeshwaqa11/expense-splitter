import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard.js';
import { getBalancesHandler } from './balances.controller.js';

export const balancesRouter = Router({ mergeParams: true });
balancesRouter.use(authGuard);
balancesRouter.get('/', getBalancesHandler);
