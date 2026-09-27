import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard.js';
import {
  createExpenseHandler,
  deleteExpenseHandler,
  getExpenseHandler,
  getExpenseHistoryHandler,
  listExpensesHandler,
  restoreExpenseHandler,
  updateExpenseHandler,
} from './expenses.controller.js';

export const expensesByGroupRouter = Router({ mergeParams: true });
expensesByGroupRouter.use(authGuard);
expensesByGroupRouter.post('/', createExpenseHandler);
expensesByGroupRouter.get('/', listExpensesHandler);

export const expenseRouter = Router();
expenseRouter.use(authGuard);
expenseRouter.get('/:id', getExpenseHandler);
expenseRouter.put('/:id', updateExpenseHandler);
expenseRouter.delete('/:id', deleteExpenseHandler);
expenseRouter.post('/:id/restore', restoreExpenseHandler);
expenseRouter.get('/:id/history', getExpenseHistoryHandler);
