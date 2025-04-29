import { z } from 'zod';

import { papiSchema } from '@/shared/papi-schemas';

export type SalaryClaimState = z.infer<typeof salaryClaimState>;
export const salaryClaimState = papiSchema.enumValue({
  Nothing: z.unknown(),
  Registered: papiSchema.bigNumber,
  Attempted: z.object({
    registered: z.optional(papiSchema.bigNumber),
    amount: papiSchema.bigNumber,
  }),
});

export type SalaryClaimantStatus = z.infer<typeof salaryClaimantStatus>;
export const salaryClaimantStatus = z.object({
  /**
   * Last active cycle
   */
  last_active: z.number(),
  status: salaryClaimState,
});

export type SalaryStatusType = z.infer<typeof salaryStatusType>;
export const salaryStatusType = z.object({
  budget: papiSchema.bigNumber,
  cycle_index: z.number(),
  cycle_start: papiSchema.blockHeight,
  total_registrations: papiSchema.bigNumber,
  total_unregisteredPaid: papiSchema.bigNumber,
});
