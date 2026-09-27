import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard.js';
import {
  createRecurringHandler,
  deleteRecurringHandler,
  listRecurringHandler,
  updateRecurringHandler,
} from './recurring.controller.js';

export const recurringRouter = Router({ mergeParams: true });
recurringRouter.use(authGuard);
recurringRouter.post('/', createRecurringHandler);
recurringRouter.get('/', listRecurringHandler);
recurringRouter.patch('/:recurringId', updateRecurringHandler);
recurringRouter.delete('/:recurringId', deleteRecurringHandler);
