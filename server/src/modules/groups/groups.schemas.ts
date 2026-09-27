import { z } from 'zod';

export const groupTypeEnum = z.enum(['HOME', 'TRIP', 'COUPLE', 'OTHER']);

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  type: groupTypeEnum,
  currency: z
    .string()
    .length(3)
    .transform((v) => v.toUpperCase()),
  memberIds: z.array(z.string()).optional().default([]),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: groupTypeEnum.optional(),
});

export const addMemberSchema = z
  .object({
    userId: z.string().optional(),
    email: z.string().email().optional(),
  })
  .refine((data) => Boolean(data.userId) || Boolean(data.email), {
    message: 'Provide a userId or email',
  });

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
