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

export const MultisigOperationStatus = {
  Pending: 'pending',
  Cancelled: 'cancelled',
  Executed: 'executed',
  Error: 'error',
} as const;
export type MultisigOperationStatus = (typeof MultisigOperationStatus)[keyof typeof MultisigOperationStatus];

export const MultisigEventStatus = {
  Approve: 'approve',
  Reject: 'reject',
} as const;
export type MultisigEventStatus = (typeof MultisigEventStatus)[keyof typeof MultisigEventStatus];

export type MultisigEvent = {
  id: string;
  accountId: AccountId;
  status: MultisigEventStatus;
  blockCreated: BlockHeight;
  indexCreated: number;
  timestamp: number;
  extrinsicHash?: HexString;
};

export type MultisigOperation = {
  id: string;
  status: MultisigOperationStatus;
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
  /**
   * Operation left on-chain storage but no terminal event was caught — the real
   * outcome is unknown until the indexer reports. Only meaningful while status
   * is 'pending'.
   */
  awaitingOutcome?: boolean;
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
