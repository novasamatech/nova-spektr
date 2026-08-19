import { type EraIndex } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

/**
 * - `subquery` — history came from the staking indexer, full `historyDepth`
 *   range;
 * - `chain` — indexer is not configured for the network, only the last few eras
 *   were scanned;
 * - `unavailable` — neither path could produce data.
 */
export type PayoutSource = 'subquery' | 'chain' | 'unavailable';

export type UnclaimedPayout = {
  era: EraIndex;
  validator: AccountId;
  /** Real exposure page index — the claim extrinsic needs it verbatim. */
  page: number;
  amount: string;
};

export type UnclaimedPayouts = {
  total: string;
  payouts: UnclaimedPayout[];
  source: PayoutSource;
};

/**
 * Validator exposure of a single era, as far as the stash is concerned.
 */
export type EraValidatorExposure = {
  era: EraIndex;
  validator: AccountId;
  /** Full exposure of the validator — the denominator of every reward share. */
  total: string;
  /** Self stake of the validator. */
  own: string;
};
