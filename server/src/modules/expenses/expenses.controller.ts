import type { NextFunction, Request, Response } from 'express';
import { createExpenseSchema, updateExpenseSchema } from './expenses.schemas.js';
import * as expensesService from './expenses.service.js';

export async function createExpenseHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createExpenseSchema.parse(req.body);
    const expense = await expensesService.createExpense(req.params.id!, req.userId!, input);
    res.status(201).json({ expense });
  } catch (err) {
    next(err);
  }
}

export async function listExpensesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const expenses = await expensesService.listExpenses(req.params.id!, req.userId!);
    res.status(200).json({ expenses });
  } catch (err) {
    next(err);
  }
}

export async function getExpenseHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const expense = await expensesService.getExpense(req.params.id!, req.userId!);
    res.status(200).json({ expense });
  } catch (err) {
    next(err);
  }
}

export async function updateExpenseHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateExpenseSchema.parse(req.body);
    const expense = await expensesService.updateExpense(req.params.id!, req.userId!, input);
    res.status(200).json({ expense });
  } catch (err) {
    next(err);
  }
}

export async function deleteExpenseHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await expensesService.deleteExpense(req.params.id!, req.userId!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function restoreExpenseHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await expensesService.restoreExpense(req.params.id!, req.userId!);
    res.status(200).json({ restored: true });
  } catch (err) {
    next(err);
  }
}

export async function getExpenseHistoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const history = await expensesService.getExpenseHistory(req.params.id!, req.userId!);
    res.status(200).json({ history });
  } catch (err) {
    next(err);
  }
}
