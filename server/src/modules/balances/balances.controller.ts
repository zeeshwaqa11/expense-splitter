import type { NextFunction, Request, Response } from 'express';
import { getGroupBalances } from './balances.service.js';

export async function getBalancesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const simplify = req.query.simplify === 'true';
    const balances = await getGroupBalances(req.params.id!, req.userId!, simplify);
    res.status(200).json(balances);
  } catch (err) {
    next(err);
  }
}
