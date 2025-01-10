import { type z } from 'zod';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

export type MultisigTimepoint = z.infer<typeof multisigTimepoint>;
export const multisigTimepoint = pjsSchema.object({
  height: pjsSchema.blockHeight,
  index: pjsSchema.blockHeight,
});

export type Multisig = z.infer<typeof multisig>;
export const multisig = pjsSchema.object({
  when: multisigTimepoint,
  deposit: pjsSchema.u128,
  depositor: pjsSchema.accountId,
  approvals: pjsSchema.vec(pjsSchema.accountId),
});
