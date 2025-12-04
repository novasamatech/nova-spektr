import { type BN } from '@polkadot/util';

import { type Chain } from '@/shared/core';
import { type ExistingVestingSchedule } from '@/entities/vesting';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type ValidationSchemaOptions = {
  chain: Chain;
  minStartingBlock: BN;
  minVestedTransfer: BN;
  maxVestingSchedules: BN;
  existingVestingSchedules: ExistingVestingSchedule;
};
