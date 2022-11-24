import { ApiPromise } from '@polkadot/api';

import { AccountID, ChainId } from '@renderer/domain/shared-kernel';

// =====================================================
// ============ IStakingService interface ==============
// =====================================================

export interface IStakingService {
  staking: StakingMap;
  validators: ValidatorMap;
  subscribeActiveEra: (chainId: ChainId, api: ApiPromise) => Promise<void>;
  subscribeLedger: (chainId: ChainId, api: ApiPromise, accounts: AccountID[]) => Promise<void>;
  getValidators: (chainId: ChainId, api: ApiPromise) => Promise<void>;
  getMaxValidators: (api: ApiPromise) => number;
  getNominators: (api: ApiPromise, account: AccountID) => Promise<string[]>;
  bondAndNominate: (
    api: ApiPromise,
    address: AccountID,
    value: string,
    payee: Payee,
    targets: AccountID[],
  ) => Promise<string>;
  bondExtra: (api: ApiPromise, address: AccountID, value: string) => Promise<string>;

  // bondExtra: () => Promise<void>;
  // unbond: () => Promise<void>;
  // rebond: () => Promise<void>;
  // withdrawUnbonded: () => Promise<void>;
  // getValidators: () => Promise<void>;
  // getValidatorsPrefs: () => Promise<void>;
  // getIdentities: () => Promise<void>;
  // getMaxValidators: () => Promise<void>;
  // getRewards: () => Promise<void>;
}

// =====================================================
// ======================= General =====================
// =====================================================

export type StakingMap = Record<AccountID, Staking | undefined>;
export type ValidatorMap = Record<AccountID, Validator>;

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
  isOversubscribed: boolean;
  isSlashed: boolean;
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
