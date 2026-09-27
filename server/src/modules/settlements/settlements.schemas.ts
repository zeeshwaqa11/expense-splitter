import { z } from 'zod';

export const createSettlementSchema = z
  .object({
    fromUserId: z.string(),
    toUserId: z.string(),
    amountCents: z.number().int().positive(),
    date: z.coerce.date(),
  })
  .refine((data) => data.fromUserId !== data.toUserId, {
    message: 'fromUserId and toUserId must differ',
    path: ['toUserId'],
  });

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
