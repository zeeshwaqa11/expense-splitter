import type { NextFunction, Request, Response } from 'express';
import { exportGroupLedgerCsv, getGroupInsights } from './insights.service.js';

export async function getInsightsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const insights = await getGroupInsights(req.params.id!, req.userId!);
    res.status(200).json(insights);
  } catch (err) {
    next(err);
  }
}

export async function exportCsvHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const csv = await exportGroupLedgerCsv(req.params.id!, req.userId!);
    res
      .status(200)
      .set('Content-Type', 'text/csv')
      .set('Content-Disposition', 'attachment; filename="ledger.csv"')
      .send(csv);
  } catch (err) {
    next(err);
  }
}
