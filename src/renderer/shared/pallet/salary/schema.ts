import { z } from 'zod';

import { pjsSchema } from '../../polkadotjsSchemas';

export type SalaryClaimState = z.infer<typeof salaryClaimState>;
export const salaryClaimState = pjsSchema.enumValue({
  Nothing: z.undefined(),
  Registered: pjsSchema.u128,
  Attempted: pjsSchema.object({
    registered: pjsSchema.optional(pjsSchema.u128),
    amount: pjsSchema.u128,
  }),
});

export type SalaryClaimantStatus = z.infer<typeof salaryClaimantStatus>;
export const salaryClaimantStatus = pjsSchema.object({
  lastActive: pjsSchema.blockHeight,
  status: salaryClaimState,
});

export type SalaryStatusType = z.infer<typeof salaryStatusType>;
export const salaryStatusType = pjsSchema.object({
  cycleIndex: pjsSchema.u32,
  cycleStart: pjsSchema.blockHeight,
  budget: pjsSchema.u128,
  totalRegistrations: pjsSchema.u128,
  totalUnregisteredPaid: pjsSchema.u128,
});
