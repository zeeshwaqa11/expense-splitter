import { z } from 'zod';
import { createExpenseSchema } from '../expenses/expenses.schemas.js';

export const createRecurringSchema = z
  .object({
    frequency: z.enum(['WEEKLY', 'MONTHLY']),
    dayOfPeriod: z.number().int(),
    template: createExpenseSchema.omit({ date: true }),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === 'MONTHLY' && (data.dayOfPeriod < 1 || data.dayOfPeriod > 31)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'dayOfPeriod must be between 1 and 31 for a MONTHLY recurrence',
        path: ['dayOfPeriod'],
      });
    }
    if (data.frequency === 'WEEKLY' && (data.dayOfPeriod < 0 || data.dayOfPeriod > 6)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'dayOfPeriod must be between 0 (Sunday) and 6 (Saturday) for a WEEKLY recurrence',
        path: ['dayOfPeriod'],
      });
    }
  });

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type RecurringTemplate = CreateRecurringInput['template'];
