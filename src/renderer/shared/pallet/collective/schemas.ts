import { type z } from 'zod';

import { pjsSchema } from '../../polkadotjs-schemas';

export type CollectiveRank = z.infer<typeof collectiveRank>;
export const collectiveRank = pjsSchema.u16;

export type CollectiveMemberRecord = z.infer<typeof collectiveMemberRecord>;
export const collectiveMemberRecord = pjsSchema.object({
  rank: collectiveRank,
});

export type CollectiveVoteRecord = z.infer<typeof collectiveVoteRecord>;
export const collectiveVoteRecord = pjsSchema.enumValue({
  Aye: pjsSchema.u32,
  Nay: pjsSchema.u32,
});
