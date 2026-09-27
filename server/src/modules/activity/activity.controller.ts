import type { NextFunction, Request, Response } from 'express';
import { listGroupActivity } from './activity.service.js';

export async function listGroupActivityHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const activity = await listGroupActivity(req.params.id!, req.userId!);
    res.status(200).json({ activity });
  } catch (err) {
    next(err);
  }
}
