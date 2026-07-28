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
  /** Era reward points earned so far, `0` when the validator has none. */
  eraPoints: number;
  /**
   * Blocks authored in the current session, read from `imOnline` on the
   * timeline (relay) chain. `null` when the chain has no `imOnline` pallet or
   * no timeline api was provided - the UI decides the fallback label.
   */
  blocksAuthored: number | null;
  /** APY in percent, `null` when the chain reports no reward data. */
  apy: number | null;
  elected: true;
};

export type EraValidatorMap = Record<AccountId, EraValidator>;
