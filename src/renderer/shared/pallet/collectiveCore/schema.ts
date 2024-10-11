import { type z } from 'zod';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

export type CollectiveCoreParams = z.infer<typeof collectiveCoreParams>;
export const collectiveCoreParams = pjsSchema.object({
  activeSalary: pjsSchema.vec(pjsSchema.u128),
  passiveSalary: pjsSchema.vec(pjsSchema.u128),
  demotionPeriod: pjsSchema.vec(pjsSchema.u32),
  minPromotionPeriod: pjsSchema.vec(pjsSchema.u32),
  offboardTimeout: pjsSchema.u32,
});

export type CollectiveCoreMemberStatus = z.infer<typeof collectiveCoreMemberStatus>;
export const collectiveCoreMemberStatus = pjsSchema.object({
  isActive: pjsSchema.bool,
  lastPromotion: pjsSchema.blockHeight,
  lastProof: pjsSchema.blockHeight,
});

export type CollectiveCoreMemberEvidence = z.infer<typeof collectiveCoreMemberEvidence>;
export const collectiveCoreMemberEvidence = pjsSchema.enumType('Retention', 'Promotion');
