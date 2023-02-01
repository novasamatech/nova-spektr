import { ApiPromise } from '@polkadot/api';

import { AccountID, ChainId, EraIndex } from '@renderer/domain/shared-kernel';
import { Stake } from '@renderer/domain/stake';
import { Validator } from '@renderer/domain/validator';

// =====================================================
// ========== IStakingDataService interface ============
// =====================================================

export interface IStakingDataService {
  subscribeStaking: (
    chainId: ChainId,
    api: ApiPromise,
    accounts: AccountID[],
    callback: (staking: StakingMap) => void,
  ) => Promise<() => void>;
  getMinNominatorBond: (api: ApiPromise) => Promise<string>;
  getUnbondingPeriod: (api: ApiPromise) => string;
  getTotalStaked: (api: ApiPromise, era: EraIndex) => Promise<string>;
}

// =====================================================
// ============ IStakingTxService interface ============
// =====================================================

export interface IStakingTxService {
  bondAndNominate: (
    api: ApiPromise,
    address: AccountID,
    value: string,
    payee: Payee,
    targets: AccountID[],
  ) => Promise<string>;
  bondExtra: (api: ApiPromise, address: AccountID, value: string) => Promise<string>;

  // unbond: () => Promise<void>;
  // rebond: () => Promise<void>;
  // withdrawUnbonded: () => Promise<void>;
}

// =====================================================
// ============ IRewardsService interface ==============
// =====================================================

export interface IStakingRewardsService {
  rewards: RewardsMap;
  isLoading: boolean;
}

// =====================================================
// ========== IValidatorsService interface =============
// =====================================================

export interface IValidatorsService {
  getValidators: (chainId: ChainId, api: ApiPromise, era: EraIndex) => Promise<ValidatorMap>;
  getMaxValidators: (api: ApiPromise) => number;
  getNominators: (api: ApiPromise, account: AccountID) => Promise<ValidatorMap>;
}

// =====================================================
// ========== IValidatorsService interface =============
// =====================================================

export interface IEraService {
  subscribeActiveEra: (api: ApiPromise, callback: (era?: EraIndex) => void) => Promise<() => void>;
}

// =====================================================
// ======================= General =====================
// =====================================================

export type StakingMap = Record<AccountID, Stake | undefined>;
export type ValidatorMap = Record<AccountID, Validator>;
export type RewardsMap = Record<AccountID, string>;

export type Payee = 'Stash' | 'Staked' | 'Controller' | { Account: string };
export type ApyValidator = Pick<Validator, 'address' | 'totalStake' | 'commission'>;
