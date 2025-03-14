import { type BN } from '@polkadot/util';

import { type CallHash, type ChainId, type HexString } from '@/shared/core';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';

export type MultisigEvent = {
  id: string;
  accountId: AccountId;
  status: 'approve' | 'reject';
  blockCreated: BlockHeight;
  indexCreated: number;
  timestamp: number;
  extrinsicHash?: HexString;
};

export type MultisigOperationData = {
  method?: string | null;
  section?: string | null;
  args?: Record<string, any> | null;
};

export type MultisigOperation = MultisigOperationData & {
  id: string;
  status: 'pending' | 'cancelled' | 'executed' | 'error';
  chainId: ChainId;
  accountId: AccountId;
  callHash: CallHash;
  callData: HexString | null;
  depositor: AccountId;
  deposit?: BN;
  blockCreated: BlockHeight;
  indexCreated: number;
  events: MultisigEvent[];
  timestamp: number;
};

export type MultisigOperationDB = Omit<MultisigOperation, 'deposit'> & { deposit?: string };
