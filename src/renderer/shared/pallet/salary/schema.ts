import { z } from 'zod';

import { papiSchema } from '@/shared/papi-schemas';

export type SalaryClaimState = z.infer<typeof salaryClaimState>;
export const salaryClaimState = z
  .discriminatedUnion('status', [
    z.object({
      status: z.literal('Nothing'),
      value: z.undefined(),
    }),
    z.object({
      status: z.literal('Registered'),
      value: papiSchema.bigNumber,
    }),
    z.object({
      status: z.literal('Attempted'),
      value: z.object({
        registered: z.optional(papiSchema.bigNumber),
        amount: papiSchema.bigNumber,
      }),
    }),
  ])
  .transform(({ status, value }) => {
    switch (status) {
      case 'Nothing':
        return { type: status, data: undefined };
      case 'Registered':
        return { type: status, data: value };
      case 'Attempted':
        return { type: status, data: value };
    }
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
