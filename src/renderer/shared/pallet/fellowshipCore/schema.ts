import { type z } from 'zod';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

export type FellowshipCoreParams = z.infer<typeof fellowshipCoreParams>;
export const fellowshipCoreParams = pjsSchema.object({
  activeSalary: pjsSchema.vec(pjsSchema.u128),
  passiveSalary: pjsSchema.vec(pjsSchema.u128),
  demotionPeriod: pjsSchema.vec(pjsSchema.u32),
  minPromotionPeriod: pjsSchema.vec(pjsSchema.u32),
  offboardTimeout: pjsSchema.u32,
});

export type FellowshipCoreMemberStatus = z.infer<typeof fellowshipCoreMemberStatus>;
export const fellowshipCoreMemberStatus = pjsSchema.object({
  isActive: pjsSchema.bool,
  lastPromotion: pjsSchema.blockHeight,
  lastProof: pjsSchema.blockHeight,
});

export type FellowshipCoreMemberEvidence = z.infer<typeof fellowshipCoreMemberEvidence>;
export const fellowshipCoreMemberEvidence = pjsSchema.enumType('Retention', 'Promotion');
