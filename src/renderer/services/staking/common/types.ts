import { ApiPromise } from '@polkadot/api';

import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { Staking } from '@renderer/domain/staking';
import { Validator } from '@renderer/domain/validator';

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

export type Payee = 'Stash' | 'Staked' | 'Controller' | { Account: string };

export type ApyValidator = Pick<Validator, 'address' | 'totalStake' | 'commission'>;
