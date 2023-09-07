import { ApiPromise } from '@polkadot/api';
import { BaseTxInfo, OptionsWithMeta, UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { Weight } from '@polkadot/types/interfaces';
import { SubmittableExtrinsic } from '@polkadot/api/types';

import { Address, CallData, HexString, Timepoint, Threshold, AccountId, ChainId } from '@renderer/domain/shared-kernel';
import { DecodedTransaction, Transaction, TransactionType } from '@renderer/entities/transaction/model/transaction';
import { TxWrappers } from '@renderer/entities/transaction';
import { MultisigAccount } from '@renderer/entities/account';

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
  getTransactionFeeV2: (api: ApiPromise) => Promise<string>;
  getExtrinsicWeight: (extrinsic: SubmittableExtrinsic<'promise'>) => Promise<Weight>;
  getTransactionDeposit: (threshold: Threshold, api: ApiPromise) => string;
  getTransactionHash: (transaction: Transaction, api: ApiPromise) => HashData;
  decodeCallData: (api: ApiPromise, accountId: Address, callData: CallData) => DecodedTransaction;
  verifySignature: (payload: Uint8Array, signature: HexString, accountId: AccountId) => Boolean;
  setTxs: (txs: Transaction[]) => void;
};

export type ITransactionServiceV2 = {
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
  getTransactionFee: (api: ApiPromise) => Promise<string>;
  getExtrinsicWeight: (extrinsic: SubmittableExtrinsic<'promise'>) => Promise<Weight>;
  getTransactionDeposit: (threshold: Threshold, api: ApiPromise) => string;
  getTransactionHash: (api: ApiPromise, transaction?: Transaction) => HashData;
  decodeCallData: (api: ApiPromise, accountId: Address, callData: CallData) => DecodedTransaction;
  verifySignature: (payload: Uint8Array, signature: HexString, accountId: AccountId) => Boolean;
  setTxs: (txs: Transaction[]) => void;
  txs: Transaction[];
  setWrapAs: (wrappers: TxWrappers[]) => void;
  wrapTx: (api: ApiPromise, addressPrefix: number) => Transaction;
};

// =====================================================
// =========== IExtrinsicService interface ===========
// =====================================================
export type IExtrinsicService = {
  getUnsignedTransaction: Record<
    TransactionType,
    (args: Transaction, info: BaseTxInfo, options: OptionsWithMeta, api: ApiPromise) => UnsignedTransaction
  >;
  getExtrinsic: Record<
    TransactionType,
    (args: Record<string, any>, api: ApiPromise) => SubmittableExtrinsic<'promise'>
  >;
  buildTransaction: (
    type: TransactionType,
    address: Address,
    chainId: ChainId,
    args: Record<string, any>,
  ) => Transaction;
  wrapAsMulti: (
    account: MultisigAccount,
    signerAccountId: AccountId,
    transaction: Transaction,
    api: ApiPromise,
    addressPrefix: number,
  ) => Transaction;
};

// =====================================================
// ============= ICallDataDecoder interface ============
// =====================================================

export type ICallDataDecoder = {
  decodeCallData: (api: ApiPromise, address: Address, callData: CallData) => DecodedTransaction;
  getTxFromCallData: (api: ApiPromise, callData: CallData) => SubmittableExtrinsic<'promise'>;
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
