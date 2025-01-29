/* eslint-disable prettier/prettier */
import { type BN } from '@polkadot/util';

import { type BlockHeight } from '@/shared/polkadotjs-schemas';

/**
 *    registrationPeriod     payoutPeriod
 * |----------------------|----------------|
 *
 * ^ cycleStart
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
}

export type ClaimStatus = {
  type: 'none';
  lastActive: number;
} | {
  type: 'registered',
  amount: BN;
  lastActive: number;
} | {
  type: 'payout'
  registered: BN;
  amount: BN;
  lastActive: number;
}
