import { type ApiPromise } from '@polkadot/api';

import { type ChainId, type EraIndex, type Stake, type Unlocking, type Validator } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

// =====================================================
// ========== IStakingDataService interface ============
// =====================================================

export interface IStakingDataService {
  subscribeStaking: (
    chainId: ChainId,
    api: ApiPromise,
    accounts: AccountId[],
    callback: (staking: StakingMap) => void,
  ) => Promise<() => void>;
  fetchLedger: (chainId: ChainId, api: ApiPromise, accounts: AccountId[]) => Promise<StakingMap>;
  getMinNominatorBond: (api: ApiPromise) => Promise<string>;
  getUnbondingPeriod: (api: ApiPromise, timelineApi: ApiPromise) => string;
  getTotalStaked: (api: ApiPromise, era: EraIndex) => Promise<string>;
  getNextUnstakingEra: (unlocking?: Unlocking[], era?: number) => EraIndex | undefined;
  hasRedeem: (unlocking?: Unlocking[], era?: number) => boolean;
  getEraDurationSeconds: (api: ApiPromise, timelineApi: ApiPromise) => number;
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

export type StakingMap = Record<AccountId, Stake | undefined>;
export type ValidatorMap = Record<AccountId, Validator>;
export type RewardsMap = Record<AccountId, string>;

export type Payee = 'Stash' | 'Staked' | 'Controller' | { Account: string };
export type ApyValidator = Pick<Validator, 'accountId' | 'totalStake' | 'commission'>;
