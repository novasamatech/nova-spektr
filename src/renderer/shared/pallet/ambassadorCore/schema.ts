import { type z } from 'zod';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

export type AmbassadorCoreParams = z.infer<typeof ambassadorCoreParams>;
export const ambassadorCoreParams = pjsSchema.object({
  activeSalary: pjsSchema.vec(pjsSchema.u128),
  passiveSalary: pjsSchema.vec(pjsSchema.u128),
  demotionPeriod: pjsSchema.vec(pjsSchema.u32),
  minPromotionPeriod: pjsSchema.vec(pjsSchema.u32),
  offboardTimeout: pjsSchema.u32,
});

export type AmbassadorCoreMemberStatus = z.infer<typeof ambassadorCoreMemberStatus>;
export const ambassadorCoreMemberStatus = pjsSchema.object({
  isActive: pjsSchema.bool,
  lastPromotion: pjsSchema.blockHeight,
  lastProof: pjsSchema.blockHeight,
});

export type AmbassadorCoreMemberEvidence = z.infer<typeof ambassadorCoreMemberEvidence>;
export const ambassadorCoreMemberEvidence = pjsSchema.enumType('Retention', 'Promotion');
