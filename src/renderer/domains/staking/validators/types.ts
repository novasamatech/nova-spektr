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
   * How many nominators of this validator are actually rewarded - the chain's
   * `maxExposurePageSize`. `null` when the runtime does not expose the const,
   * in which case nothing can be proven oversubscribed.
   */
  maxNominatorsRewarded: number | null;
  /** More nominators than fit into one exposure page - the tail earns nothing. */
  oversubscribed: boolean;
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
