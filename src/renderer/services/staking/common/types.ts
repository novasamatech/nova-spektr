import { AccountID, ChainId } from '@renderer/domain/shared-kernel';

// =====================================================
// ============ IStakingService interface ==============
// =====================================================

export interface IStakingService {
  staking: StakingMap;
  validators: Validator[];
  subscribeActiveEra: () => Promise<void>;
  subscribeLedger: (accounts: AccountID[]) => Promise<void>;
  getNominators: (account: AccountID) => Promise<string[]>;
  bondAndNominate: (address: AccountID, value: string, payee: Payee, targets: AccountID[]) => Promise<string>;
  bondExtra: (address: AccountID, value: string) => Promise<string>;

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
  name: string;
  address: AccountID;
  ownStake: string;
  totalStake: string;
  isOversubscribed: boolean;
  isSlashed: boolean;
  apy: number;
  identity?: Identity;
};

type Identity = {
  rawName: string;
  address: AccountID;
  email: string;
  website: string;
  twitter: string;
  riot: string;
  parent: ParentIdentity;
};

type ParentIdentity = {
  address: AccountID;
  name: string;
};

export type Payee = 'Stash' | 'Staked' | 'Controller' | { Account: string };
