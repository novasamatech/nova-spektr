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
