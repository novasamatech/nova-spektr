import { ApiPromise } from '@polkadot/api';

import type { Address, ChainId, EraIndex, Stake, Unlocking, Validator } from '@shared/core';

// =====================================================
// ========== IStakingDataService interface ============
// =====================================================

export interface IStakingDataService {
  subscribeStaking: (
    chainId: ChainId,
    api: ApiPromise,
    addresses: Address[],
    callback: (staking: StakingMap) => void,
  ) => Promise<() => void>;
  getMinNominatorBond: (api: ApiPromise) => Promise<string>;
  getUnbondingPeriod: (api: ApiPromise) => string;
  getTotalStaked: (api: ApiPromise, era: EraIndex) => Promise<string>;
  getNextUnstakingEra: (unlocking?: Unlocking[], era?: number) => EraIndex | undefined;
  hasRedeem: (unlocking?: Unlocking[], era?: number) => boolean;
}

// =====================================================
// ============ IRewardsService interface ==============
// =====================================================

export interface IStakingRewardsService {
  rewards: RewardsMap;
  isRewardsLoading: boolean;
}

// =====================================================
// ======================= General =====================
// =====================================================

export type StakingMap = Record<Address, Stake | undefined>;
export type ValidatorMap = Record<Address, Validator>;
export type RewardsMap = Record<Address, string>;

export type Payee = 'Stash' | 'Staked' | 'Controller' | { Account: string };
export type ApyValidator = Pick<Validator, 'address' | 'totalStake' | 'commission'>;
