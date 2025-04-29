import { z } from 'zod';

import { papiSchema } from '@/shared/papi-schemas';

export type CollectiveMemberRecord = z.infer<typeof collectiveMemberRecord>;
export const collectiveMemberRecord = z.object({
  rank: z.number(),
});

export type CollectiveVoteRecord = z.infer<typeof collectiveVoteRecord>;
export const collectiveVoteRecord = papiSchema.enumValue({
  Aye: z.number(),
  Nay: z.number(),
});
