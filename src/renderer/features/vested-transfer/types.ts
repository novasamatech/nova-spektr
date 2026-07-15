import { type BN } from '@polkadot/util';

import { type AccountId } from '@/shared/polkadotjs-schemas';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type ValidationSchemaOptions = {
  /**
   * The timeline chain's current head. `null` while it is unknown, in which
   * case the past-block warning is skipped — there is nothing to compare
   * against.
   */
  minStartingBlock: BN | null;
  minVestedTransfer: BN;
  maxVestingSchedules: BN;
  existingVestingSchedules: Record<AccountId, number>;
  targetOccurrences?: Record<AccountId, number>;
};
