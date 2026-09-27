import { z } from 'zod';

export const expenseCategoryEnum = z.enum([
  'FOOD',
  'RENT',
  'TRANSPORT',
  'UTILITIES',
  'ENTERTAINMENT',
  'OTHER',
]);

const payerSchema = z.object({
  userId: z.string(),
  amountCents: z.number().int().positive(),
});

const splitInputSchema = z.discriminatedUnion('splitType', [
  z.object({ splitType: z.literal('EQUAL'), memberIds: z.array(z.string()).min(1) }),
  z.object({
    splitType: z.literal('EXACT'),
    amounts: z.record(z.string(), z.number().int().positive()),
  }),
  z.object({
    splitType: z.literal('PERCENTAGE'),
    percentages: z.record(z.string(), z.number().positive()),
  }),
  z.object({
    splitType: z.literal('SHARES'),
    shares: z.record(z.string(), z.number().int().positive()),
  }),
]);

export const createExpenseSchema = z.object({
  description: z.string().min(1).max(200),
  totalCents: z.number().int().positive(),
  category: expenseCategoryEnum,
  date: z.coerce.date(),
  notes: z.string().max(1000).optional(),
  payers: z.array(payerSchema).min(1),
  split: splitInputSchema,
});

export const updateExpenseSchema = createExpenseSchema;

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type SplitInputPayload = z.infer<typeof splitInputSchema>;
