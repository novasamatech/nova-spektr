import { ApiPromise } from '@polkadot/api';

import { Address, ChainId, EraIndex } from '@renderer/domain/shared-kernel';
import { Stake } from '@renderer/entities/staking/model/stake';
import { Validator } from '@renderer/domain/validator';

// =====================================================
// ========== IStakingDataService interface ============
// =====================================================

export interface IStakingDataService {
  subscribeStaking: (
    chainId: ChainId,
    api: ApiPromise,
    accounts: Address[],
    callback: (staking: StakingMap) => void,
  ) => Promise<() => void>;
  getMinNominatorBond: (api: ApiPromise) => Promise<string>;
  getUnbondingPeriod: (api: ApiPromise) => string;
  getTotalStaked: (api: ApiPromise, era: EraIndex) => Promise<string>;
}

// =====================================================
// ============ IRewardsService interface ==============
// =====================================================

export interface IStakingRewardsService {
  rewards: RewardsMap;
  isRewardsLoading: boolean;
}

// =====================================================
// ========== IValidatorsService interface =============
// =====================================================

export interface IValidatorsService {
  getValidatorsWithInfo: (
    chainId: ChainId,
    api: ApiPromise,
    era: EraIndex,
    isLightClient?: boolean,
  ) => Promise<ValidatorMap>;
  getValidatorsList: (api: ApiPromise, era: EraIndex) => Promise<ValidatorMap>;
  getMaxValidators: (api: ApiPromise) => number;
  getNominators: (api: ApiPromise, stash: Address, isLightClient?: boolean) => Promise<ValidatorMap>;
}

// =====================================================
// ========== IValidatorsService interface =============
// =====================================================

export interface IEraService {
  subscribeActiveEra: (api: ApiPromise, callback: (era?: EraIndex) => void) => Promise<() => void>;
  getTimeToEra: (api: ApiPromise, era?: EraIndex) => Promise<number>;
}

// =====================================================
// ======================= General =====================
// =====================================================

export type StakingMap = Record<Address, Stake | undefined>;
export type ValidatorMap = Record<Address, Validator>;
export type RewardsMap = Record<Address, string>;

export type Payee = 'Stash' | 'Staked' | 'Controller' | { Account: string };
export type ApyValidator = Pick<Validator, 'address' | 'totalStake' | 'commission'>;
