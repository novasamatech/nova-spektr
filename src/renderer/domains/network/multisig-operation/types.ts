import { type BN } from '@polkadot/util';

import {
  type CallData,
  type CallHash,
  type ChainId,
  type DecodedTransaction,
  type HexString,
  type MultisigTxStatus,
  type Signatory,
  type Transaction,
} from '@/shared/core';
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

export type MultisigOperation = {
  id: string;
  status: 'pending' | 'cancelled' | 'executed' | 'error';
  transaction: DecodedTransaction | null;
  method: string | null;
  section: string | null;
  callHash: HexString;
  callData: HexString | null;
  chainId: ChainId;
  multisigAccountId: AccountId;
  proxiedAccountId?: AccountId;
  depositor: AccountId;
  deposit?: BN;
  blockCreated: BlockHeight;
  indexCreated: number;
  events: MultisigEvent[];
  timestamp: number;
};

export type MultisigTransaction = {
  accountId: AccountId;
  chainId: ChainId;
  callData?: CallData;
  callHash: CallHash;
  status: MultisigTxStatus;
  signatories: Signatory[];
  deposit?: string;
  depositor?: AccountId;
  blockCreated: number;
  indexCreated: number;
  dateCreated?: number;
  transaction?: Transaction | DecodedTransaction;
};
