import { AccountID, ChainId } from '@renderer/domain/shared-kernel';

// =====================================================
// ============ IStakingService interface ==============
// =====================================================

export interface IStakingService {
  staking: StakingMap;
  getLedger: (accounts: AccountID[]) => void;
  getNominators: (account: AccountID) => Promise<string[]>;
  // getBonded: () => Promise<void>;
  // bond: () => Promise<void>;
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
