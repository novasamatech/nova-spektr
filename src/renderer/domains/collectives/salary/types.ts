import { type BN } from '@polkadot/util';

import { type Transaction } from '@/shared/core';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType } from '../_lib/types';

/**
 * |-- registration period --|-- payout period --|
 *
 * ^ cycle start
 */
export type SalaryCycle = {
  cycleIndex: number;
  cycleStart: BlockHeight;
  registrationPeriod: BlockHeight;
  payoutPeriod: BlockHeight;
  budget: BN;
  totalRegistrations: BN;
  totalUnregisteredPaid: BN;
};

export type SalaryCyclePeriod =
  | {
      type: 'unknown';
      cycleIndex: number;
    }
  | {
      type: 'registration';
      left: BlockHeight;
      until: BlockHeight;
      cycleIndex: number;
    }
  | {
      type: 'payout';
      left: BlockHeight;
      until: BlockHeight;
      cycleIndex: number;
    };

export type Salaries = {
  active: BN[];
  passive: BN[];
};

export type ClaimStatus =
  | {
      // Member is not indicted
      type: 'none';
      lastActive: number;
    }
  | {
      // No actions yet
      type: 'nothing';
      lastActive: number;
    }
  | {
      // Salary request is registered
      type: 'registered';
      amount: BN;
      lastActive: number;
    }
  | {
      // Salary is paid
      type: 'payout';
      registered: BN;
      amount: BN;
      lastActive: number;
    };

export type SalaryRequestTransaction = Transaction<{
  pallet: CollectivePalletsType;
}>;

export type SalaryPayoutTransaction = Transaction<{
  pallet: CollectivePalletsType;
  beneficiary: AccountId | null;
}>;
