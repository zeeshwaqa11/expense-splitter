import type { NextFunction, Request, Response } from 'express';
import { createSettlementSchema } from './settlements.schemas.js';
import * as settlementsService from './settlements.service.js';

export async function createSettlementHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createSettlementSchema.parse(req.body);
    const settlement = await settlementsService.createSettlement(
      req.params.id!,
      req.userId!,
      input,
    );
    res.status(201).json({ settlement });
  } catch (err) {
    next(err);
  }
}

export async function listSettlementsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const settlements = await settlementsService.listSettlements(req.params.id!, req.userId!);
    res.status(200).json({ settlements });
  } catch (err) {
    next(err);
  }
}
