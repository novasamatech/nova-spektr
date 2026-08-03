import { z } from 'zod';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

/**
 * Balance-like fields of staking structs are `#[codec(compact)]` encoded on
 * chain, but plain on some fixtures/runtimes — accept both.
 */
const u128Value = z.union([pjsSchema.u128, pjsSchema.compact(pjsSchema.u128)]);
const u32Value = z.union([pjsSchema.u32, pjsSchema.compact(pjsSchema.u32)]);

export type StakingActiveEraInfo = z.infer<typeof stakingActiveEraInfo>;
export const stakingActiveEraInfo = pjsSchema.object({
  index: pjsSchema.u32,
  start: pjsSchema.optional(pjsSchema.u64),
});

export type StakingPagedExposureMetadata = z.infer<typeof stakingPagedExposureMetadata>;
export const stakingPagedExposureMetadata = pjsSchema.object({
  total: u128Value,
  own: u128Value,
  nominatorCount: pjsSchema.u32,
  pageCount: pjsSchema.u32,
});

export type StakingExposurePage = z.infer<typeof stakingExposurePage>;
export const stakingExposurePage = pjsSchema.object({
  pageTotal: u128Value,
  others: pjsSchema.vec(
    pjsSchema.object({
      who: pjsSchema.accountId,
      value: u128Value,
    }),
  ),
});

export type StakingValidatorPrefs = z.infer<typeof stakingValidatorPrefs>;
export const stakingValidatorPrefs = pjsSchema.object({
  commission: pjsSchema.perbill,
  blocked: pjsSchema.bool,
});

export type StakingNominations = z.infer<typeof stakingNominations>;
export const stakingNominations = pjsSchema.object({
  targets: pjsSchema.vec(pjsSchema.accountId),
  submittedIn: pjsSchema.u32,
  suppressed: pjsSchema.bool,
});

export type StakingLedger = z.infer<typeof stakingLedger>;
export const stakingLedger = pjsSchema
  .object({
    stash: pjsSchema.accountId,
    total: u128Value,
    active: u128Value,
    unlocking: pjsSchema.vec(
      pjsSchema.object({
        value: u128Value,
        era: u32Value,
      }),
    ),
    // Absent on staking-async runtimes, named `claimedRewards` on older ones.
    legacyClaimedRewards: pjsSchema.vec(pjsSchema.u32).optional(),
    claimedRewards: pjsSchema.vec(pjsSchema.u32).optional(),
  })
  .transform(({ claimedRewards, ...ledger }) => ({
    ...ledger,
    legacyClaimedRewards: ledger.legacyClaimedRewards ?? claimedRewards,
  }));

export type StakingRewardDestination = z.infer<typeof stakingRewardDestination>;
export const stakingRewardDestination = pjsSchema.enumValue({
  Staked: pjsSchema.null,
  Stash: pjsSchema.null,
  Controller: pjsSchema.null,
  Account: pjsSchema.accountId,
  None: pjsSchema.null,
});

export type StakingEraRewardPoints = z.infer<typeof stakingEraRewardPoints>;
export const stakingEraRewardPoints = pjsSchema.object({
  total: pjsSchema.u32,
  individual: pjsSchema.btreeMap(pjsSchema.accountId, pjsSchema.u32),
});

export type StakingUnappliedSlash = z.infer<typeof stakingUnappliedSlash>;
export const stakingUnappliedSlash = pjsSchema.object({
  validator: pjsSchema.accountId,
  own: u128Value,
  others: pjsSchema.vec(pjsSchema.codecTuple(pjsSchema.accountId, u128Value)),
  payout: u128Value,
});

export type StakingSlashingSpans = z.infer<typeof stakingSlashingSpans>;
export const stakingSlashingSpans = pjsSchema.object({
  spanIndex: pjsSchema.u32,
  lastStart: pjsSchema.u32,
  lastNonzeroSlash: pjsSchema.u32,
  prior: pjsSchema.vec(pjsSchema.u32),
});
