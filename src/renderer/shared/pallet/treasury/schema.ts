import { z } from 'zod';

import { pjsSchema } from '@/shared/polkadotjsSchemas';

export type TreasuryProposal = z.infer<typeof treasuryProposal>;
export const treasuryProposal = pjsSchema.object({
  proposer: pjsSchema.accountId,
  value: pjsSchema.u128,
  beneficiary: pjsSchema.accountId,
  bond: pjsSchema.u128,
});

export type TreasuryPaymentState = z.infer<typeof treasuryPaymentState>;
export const treasuryPaymentState = pjsSchema.enumValue({
  Pending: z.undefined(),
  Failed: z.undefined(),
  Attempted: pjsSchema.object({
    id: pjsSchema.null,
  }),
});

export type TreasurySpendStatus = z.infer<typeof treasurySpendStatus>;
export const treasurySpendStatus = pjsSchema.object({
  assetKind: pjsSchema.u32,
  amount: pjsSchema.u128,
  beneficiary: pjsSchema.accountId,
  validFrom: pjsSchema.u32,
  expireAt: pjsSchema.u32,
  status: treasuryPaymentState,
});
