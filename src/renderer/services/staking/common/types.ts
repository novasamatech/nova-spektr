import { ApiPromise } from '@polkadot/api';

import { AccountID, ChainId } from '@renderer/domain/shared-kernel';

// =====================================================
// ============ IStakingDataService interface ==============
// =====================================================

export interface IStakingDataService {
  subscribeActiveEra: (chainId: ChainId, api: ApiPromise, callback: (era?: number) => void) => Promise<() => void>;
  subscribeStaking: (
    chainId: ChainId,
    api: ApiPromise,
    accounts: AccountID[],
    callback: (staking: StakingMap) => void,
  ) => Promise<() => void>;
  getMinNominatorBond: (api: ApiPromise) => Promise<string>;
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
// ============ IStakingDataService interface ==============
// =====================================================

export interface IValidatorsService {
  getValidators: (chainId: ChainId, api: ApiPromise, era: number) => Promise<ValidatorMap>;
  getMaxValidators: (api: ApiPromise) => number;
  getNominators: (api: ApiPromise, account: AccountID) => Promise<string[]>;
}

// =====================================================
// ======================= General =====================
// =====================================================

export type StakingMap = Record<AccountID, Staking | undefined>;
export type ValidatorMap = Record<AccountID, Validator>;
export type RewardsMap = Record<AccountID, string>;

export type Staking = {
  accountId: AccountID;
  chainId: ChainId;
  controller: AccountID;
  stash: AccountID;
  active: string;
  total: string;
  unlocking: Unlocking[];
};

type Unlocking = {
  value: string;
  era: string;
};

// TODO: maybe move to kernel
export type Validator = {
  address: AccountID;
  chainId: ChainId;
  ownStake: string;
  totalStake: string;
  commission: number;
  blocked: boolean;
  oversubscribed: boolean;
  slashed: boolean;
  apy: number;
  identity?: Identity;
};

export type Identity = {
  subName: string;
  email: string;
  website: string;
  twitter: string;
  riot: string;
  parent: ParentIdentity;
};

type ParentIdentity = {
  address: AccountID;
  name: string;
  // judgements: Judgement[];
};

// type Judgement = {
//   votes: number;
//   verdict: string;
// };

export type Payee = 'Stash' | 'Staked' | 'Controller' | { Account: string };

export type SubIdentity = {
  sub: AccountID;
  parent: AccountID;
  subName: string;
};

export type ApyValidator = Pick<Validator, 'address' | 'totalStake' | 'commission'>;
