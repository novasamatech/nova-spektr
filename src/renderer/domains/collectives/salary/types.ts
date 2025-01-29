import { type BN } from '@polkadot/util';

import { type Transaction } from '@/shared/core';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType } from '../_lib/types';

/**
 * |-- registration period --|-- payout period --|
 *
 * ^ cycle start
 */
export type SalaryCycleStatus = {
  cycleIndex: number;
  cycleStart: BlockHeight;
  registrationPeriod: BlockHeight;
  payoutPeriod: BlockHeight;
  budget: BN;
  totalRegistrations: BN;
  totalUnregisteredPaid: BN;
};

export type Salaries = {
  active: BN[];
  passive: BN[];
};

export type ClaimStatus =
  | {
      type: 'none';
      lastActive: number;
    }
  | {
      type: 'registered';
      amount: BN;
      lastActive: number;
    }
  | {
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
