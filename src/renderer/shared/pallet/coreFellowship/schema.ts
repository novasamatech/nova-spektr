import { z } from 'zod';

import { pjsSchema } from '@/shared/polkadotjsSchemas';

export type CoreFellowshipParams = z.infer<typeof coreFellowshipParams>;
export const coreFellowshipParams = pjsSchema.object({
  activeSalary: pjsSchema.vec(pjsSchema.u128),
  passiveSalary: pjsSchema.vec(pjsSchema.u128),
  demotionPeriod: pjsSchema.vec(pjsSchema.u32),
  minPromotionPeriod: pjsSchema.vec(pjsSchema.u32),
  offboardTimeout: pjsSchema.u32,
});

export type CoreFellowshipMemberStatus = z.infer<typeof coreFellowshipMemberStatus>;
export const coreFellowshipMemberStatus = pjsSchema.object({
  isActive: z.boolean(),
  lastPromotion: pjsSchema.u32,
  lastProof: pjsSchema.u32,
});

export type CoreFellowshipMemberEvidence = z.infer<typeof coreFellowshipMemberEvidence>;
export const coreFellowshipMemberEvidence = pjsSchema.enumType('Retention', 'Promotion');
