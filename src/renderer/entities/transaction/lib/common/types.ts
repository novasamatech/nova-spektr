import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { Weight } from '@polkadot/types/interfaces';

import { Address, CallData, HexString, Timepoint, Threshold, AccountId } from '@renderer/domain/shared-kernel';
import { DecodedTransaction, Transaction } from '@renderer/entities/transaction/model/transaction';

// =====================================================
// =========== ITransactionService interface ===========
// =====================================================

export type ITransactionService = {
  createPayload: (
    transaction: Transaction,
    api: ApiPromise,
  ) => Promise<{
    unsigned: UnsignedTransaction;
    payload: Uint8Array;
  }>;
  getSignedExtrinsic: (unsigned: UnsignedTransaction, signature: HexString, api: ApiPromise) => Promise<string>;
  submitAndWatchExtrinsic: (
    tx: string,
    unsigned: UnsignedTransaction,
    api: ApiPromise,
    callback: (executed: boolean, params: ExtrinsicResultParams | string) => void,
  ) => void;
  getTransactionFee: (transaction: Transaction, api: ApiPromise) => Promise<string>;
  getTxWeight: (transaction: Transaction, api: ApiPromise) => Promise<Weight>;
  getTransactionDeposit: (threshold: Threshold, api: ApiPromise) => string;
  getTransactionHash: (transaction: Transaction, api: ApiPromise) => HashData;
  decodeCallData: (api: ApiPromise, accountId: Address, callData: CallData) => DecodedTransaction;
  verifySignature: (payload: string | Uint8Array, signature: HexString, accountId: AccountId) => Boolean;
};

// =====================================================
// ============= ICallDataDecoder interface ============
// =====================================================

export type ICallDataDecoder = {
  decodeCallData: (api: ApiPromise, address: Address, callData: CallData) => DecodedTransaction;
};

// =====================================================
// ======================= General =====================
// =====================================================

export type HashData = {
  callData: HexString;
  callHash: HexString;
};

export type ExtrinsicResultParams = {
  timepoint: Timepoint;
  extrinsicHash: HexString;
  isFinalApprove: boolean;
  multisigError: string;
};
