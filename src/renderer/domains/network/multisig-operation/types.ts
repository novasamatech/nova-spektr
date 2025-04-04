import { type BN } from '@polkadot/util';

import { type CallHash, type ChainId, type HexString } from '@/shared/core';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';
import { type AnyDecodedTransaction } from '../transaction/types';

export type MultisigEvent = {
  id: string;
  accountId: AccountId;
  status: 'approve' | 'reject';
  blockCreated: BlockHeight;
  indexCreated: number;
  timestamp: number;
  extrinsicHash?: HexString;
};

export type MultisigOperation = {
  id: string;
  status: 'pending' | 'cancelled' | 'executed' | 'error';
  transaction: AnyDecodedTransaction | null;
  method: string | null;
  section: string | null;
  callHash: CallHash;
  callData: HexString | null;
  chainId: ChainId;
  accountId: AccountId;
  depositor: AccountId;
  deposit?: BN;
  blockCreated: BlockHeight;
  indexCreated: number;
  events: MultisigEvent[];
  timestamp: number;
};

export type MultisigOperationDB = Omit<MultisigOperation, 'deposit'> & { deposit?: string };
