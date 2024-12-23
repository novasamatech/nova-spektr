import { type BN } from '@polkadot/util';

import { type CallHash, type ChainId, type HexString } from '@/shared/core';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';

export type MultisigEvent = {
  accountId: AccountId;
  chainId: ChainId;
  callHash: CallHash;
  status: 'approved' | 'rejected';
  blockCreated: BlockHeight;
  indexCreated: BlockHeight;
  extrinsicHash?: HexString;
};

export type MultisigOperation = {
  status: 'pending' | 'cancelled' | 'executed' | 'error';
  accountId: AccountId;
  chainId: ChainId;
  callHash: CallHash;
  deposit: BN;
  depositor: AccountId;
  blockCreated: BlockHeight;
  indexCreated: BlockHeight;
};
