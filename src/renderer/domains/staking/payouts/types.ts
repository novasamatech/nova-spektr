import { type EraIndex } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type DataCompleteness, type ScanReport } from '../completeness';

/**
 * Where the exposures of a scan came from — provenance only. Whether the answer
 * can be trusted as a whole is `DataCompleteness`.
 *
 * - `subquery` — history came from the staking indexer;
 * - `chain` — only the on-chain scan of the last few eras answered;
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
  /**
   * `complete` — every read of the scan answered and the history covers the
   * whole claim window: an empty result really means "nothing to claim".
   * `partial` — the payouts found are real, but a read failed, an indexer lags
   * behind, or only the bounded on-chain scan ran. `unavailable` — nothing
   * could be checked.
   */
  completeness: DataCompleteness;
  /**
   * Where the indexed history came from: every indexer asked, the eras each one
   * stands for, the eras nobody holds and the rows the indexers disagree about.
   * Absent when no indexer was asked — the on-chain scan answered alone — or
   * when nothing could be checked.
   */
  scan?: ScanReport;
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
