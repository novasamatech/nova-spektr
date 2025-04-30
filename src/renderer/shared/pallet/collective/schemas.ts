import { z } from 'zod';

export type CollectiveVoteRecord = z.infer<typeof collectiveVoteRecord>;
export const collectiveVoteRecord = z
  .object({
    type: z.union([z.literal('Aye'), z.literal('Nay')]),
    value: z.number(),
  })
  .transform(item => ({ type: item.type, data: item.value }));
