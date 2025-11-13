import { type BN } from '@polkadot/util';

import { type AccountId } from '@/shared/polkadotjs-schemas';

export type VestingSchedule = {
  target: AccountId;
  locked: BN;
  startingBlock: BN;
  perBlock: BN;
};

export type ExistingVestingSchedule = Omit<VestingSchedule, 'target'>;

export type ExistingVestingScheduleMap = Record<AccountId, ExistingVestingSchedule[]>;
