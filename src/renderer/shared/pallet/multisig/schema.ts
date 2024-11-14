import { type z } from 'zod';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

export type Timepoint = z.infer<typeof timepoint>;
export const timepoint = pjsSchema.object({
  height: pjsSchema.u32,
  index: pjsSchema.u32,
});

export type Multisig = z.infer<typeof multisig>;
export const multisig = pjsSchema.object({
  when: timepoint,
  deposit: pjsSchema.u128,
  depositor: pjsSchema.accountId,
  approvals: pjsSchema.vec(pjsSchema.accountId),
});
