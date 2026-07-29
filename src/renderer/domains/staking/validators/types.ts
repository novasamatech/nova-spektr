import { type AccountId } from '@/shared/polkadotjs-schemas';

/**
 * A validator elected for a given era, with everything the staking UI shows in
 * one place.
 */
export type EraValidator = {
  accountId: AccountId;
  /** Own stake + all nominator stake, in planck. */
  totalStake: string;
  /** Validator self stake, in planck. */
  ownStake: string;
  /** Commission, in percent (0..100). */
  commission: number;
  /** Validator does not accept new nominations. */
  blocked: boolean;
  nominatorCount: number;
  pageCount: number;
  /**
   * How many nominators fit into one exposure page - the chain's
   * `maxExposurePageSize`. Purely informational: paged exposures are all
   * payable through `payout_stakers_by_page`, so a validator with more backers
   * than this is simply spread over several pages, not cut off. `null` when the
   * runtime does not expose the const.
   */
  maxNominatorsRewarded: number | null;
  slashed: boolean;
  /**
   * Reward points earned in the last completed era, `0` when the validator
   * earned none. This is the network's liveness signal: authoring, backing and
   * approval all pay into it.
   */
  eraPoints: number;
  /** APY in percent, `null` when the chain reports no reward data. */
  apy: number | null;
  elected: true;
};

export type EraValidatorMap = Record<AccountId, EraValidator>;
