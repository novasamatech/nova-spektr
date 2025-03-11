import { type Weight } from '@polkadot/types/interfaces';

import { type HexString, type Timepoint } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type DecodedTransaction } from '@/domains/network';

export type MultisigTransaction = DecodedTransaction<{
  threshold: number;
  otherSignatories: AccountId[];
  maybeTimepoint: Timepoint | null;
  call: HexString;
  maxWeight: Weight;
}>;
