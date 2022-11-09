// =====================================================
// ============ IStakingService interface ==============
// =====================================================

import { AccountID } from '@renderer/domain/shared-kernel';

export interface IStakingService {
  staking: StakingsMap;
  getBonded: () => Promise<void>;
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
// ============ IStakingService interface ==============
// =====================================================

export type StakingsMap = Record<AccountID, Staking>;

export type Staking = {
  test: string;
};
