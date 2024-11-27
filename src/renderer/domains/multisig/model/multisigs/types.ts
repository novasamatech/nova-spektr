import { type BN } from '@polkadot/util';

import { type CallData, type CallHash, type HexString } from '@/shared/core';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';

export type Timepoint = {
  height: BlockHeight;
  index: number;
};

export type MultisigEvent = {
  accountId: AccountId;
  status: 'approved' | 'rejected';
  blockCreated: BlockHeight;
  indexCreated: number;
  extrinsicHash?: HexString;
};

export type Multisig = {
  status: 'pending' | 'cancelled' | 'executed' | 'error';
  accountId: AccountId;
  callHash: CallHash;
  callData?: CallData;
  deposit: BN;
  depositor: AccountId;
  blockCreated: BlockHeight;
  indexCreated: number;
  events: MultisigEvent[];
};
