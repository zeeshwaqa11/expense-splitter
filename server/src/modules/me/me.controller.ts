import type { NextFunction, Request, Response } from 'express';
import { getMySummary } from './me.service.js';

export async function getMySummaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await getMySummary(req.userId!);
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
}
