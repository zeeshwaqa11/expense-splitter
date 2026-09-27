import type { NextFunction, Request, Response } from 'express';
import { createRecurringSchema } from './recurring.schemas.js';
import * as recurringService from './recurring.service.js';

export async function createRecurringHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createRecurringSchema.parse(req.body);
    const recurring = await recurringService.createRecurringExpense(
      req.params.id!,
      req.userId!,
      input,
    );
    res.status(201).json({ recurring });
  } catch (err) {
    next(err);
  }
}

export async function listRecurringHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const recurring = await recurringService.listRecurringExpenses(req.params.id!, req.userId!);
    res.status(200).json({ recurring });
  } catch (err) {
    next(err);
  }
}

export async function updateRecurringHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createRecurringSchema.parse(req.body);
    const recurring = await recurringService.updateRecurringExpense(
      req.params.id!,
      req.params.recurringId!,
      req.userId!,
      input,
    );
    res.status(200).json({ recurring });
  } catch (err) {
    next(err);
  }
}

export async function deleteRecurringHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await recurringService.deleteRecurringExpense(req.params.id!, req.params.recurringId!, req.userId!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
