import { type Weight } from '@polkadot/types/interfaces';
import { BN, BN_ZERO } from '@polkadot/util';

import { LEAVE_SOME_SPACE_MULTIPLIER } from './constants';

export class BlockWeight {
  constructor(
    public readonly refTime: BN,
    public readonly proofSize: BN,
  ) {}

  static fromWeight(weight: Weight): BlockWeight {
    return new BlockWeight(weight.refTime.toBn(), weight.proofSize?.toBn?.() ?? BN_ZERO);
  }

  add(other: BlockWeight): BlockWeight {
    return new BlockWeight(this.refTime.add(other.refTime), this.proofSize.add(other.proofSize));
  }

  withMargin(): BlockWeight {
    return new BlockWeight(
      this.refTime.muln(LEAVE_SOME_SPACE_MULTIPLIER),
      this.proofSize.muln(LEAVE_SOME_SPACE_MULTIPLIER),
    );
  }

  fitsIn(limit: BlockWeight): boolean {
    return this.refTime.lt(limit.refTime) && this.proofSize.lt(limit.proofSize);
  }

  static min(a: BlockWeight, b: BlockWeight): BlockWeight {
    return new BlockWeight(BN.min(a.refTime, b.refTime), BN.min(a.proofSize, b.proofSize));
  }
}
