import { type AccountId } from '@/shared/polkadotjs-schemas';

/**
 * Summary of a validator's exposure in an era, read from
 * `staking.erasStakersOverview`. Cheap: one prefix read returns the whole
 * validator set.
 */
export type ExposureOverview = {
  /** Own stake + all nominator stake, in planck. */
  total: string;
  /** Validator self stake, in planck. */
  own: string;
  /** Number of nominators backing the validator in the era. */
  nominatorCount: number;
  /** Number of exposure pages the nominators are split into. */
  pageCount: number;
};

export type ExposureIndividual = {
  who: AccountId;
  /** Nominator stake behind the validator, in planck. */
  value: string;
};

/**
 * Full exposure of a validator - the overview plus the flattened nominator
 * list, read from `staking.erasStakersPaged`. Expensive: one read per
 * validator, so it is only resolved for an explicit validator list.
 */
export type Exposure = ExposureOverview & {
  others: ExposureIndividual[];
};

export type ExposureOverviewMap = Record<AccountId, ExposureOverview>;
export type ExposureMap = Record<AccountId, Exposure>;
