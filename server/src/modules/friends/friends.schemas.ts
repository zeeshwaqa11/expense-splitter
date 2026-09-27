import { z } from 'zod';

export const addFriendSchema = z.object({
  email: z.string().email(),
});

export type AddFriendInput = z.infer<typeof addFriendSchema>;
