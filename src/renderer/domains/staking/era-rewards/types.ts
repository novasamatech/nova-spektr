import { type EraIndex } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

/**
 * One stash's share of one validator's payout in one era.
 *
 * The indexer records a reward as an amount paid to an address and nothing else
 * — no validator, no era. The only way back to "who earned this for me" is the
 * era's own arithmetic: the validator's exposure, its reward points and its
 * commission. That is what this record carries, computed rather than reported.
 *
 * It is therefore **accrued**, not **received**: an era pays out when someone
 * submits its payout call, which may be days later or not at all. The two
 * figures answer different questions and must never be presented as one.
 */
export type EraValidatorReward = {
  era: EraIndex;
  validator: AccountId;
  /** The nominating (or validating) stash the share belongs to. */
  accountId: AccountId;
  /** Planck the era's formula puts on this stash for this validator. */
  amount: string;
  /** The stash is the validator itself — commission plus its own stake. */
  isSelf: boolean;
};

/** A validator's exposure in one era, reduced to the stashes we asked about. */
export type EraExposureShares = {
  era: EraIndex;
  validator: AccountId;
  /** Full exposure of the validator — the denominator of every share. */
  total: string;
  /** Self stake of the validator. */
  own: string;
  /** Planck each of our stashes had behind it, keyed by stash. */
  shares: Record<AccountId, string>;
};
