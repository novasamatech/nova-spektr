import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction, Args } from '@substrate/txwrapper-polkadot';
import { Weight } from '@polkadot/types/interfaces';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { AnyJson } from '@polkadot/types/types';

import type { Address, CallData, HexString, Timepoint, Threshold, AccountId, ChainId } from '@shared/core';
import { DecodedTransaction, Transaction, TransactionType } from '@entities/transaction/model/transaction';
import { TxWrappers } from '@entities/transaction';

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
  getExtrinsicWeight: (extrinsic: SubmittableExtrinsic<'promise'>) => Promise<Weight>;
  getTxWeight: (transaction: Transaction, api: ApiPromise) => Promise<Weight>;
  getMultisigDeposit: (threshold: Threshold, api: ApiPromise) => string;
  getTransactionHash: (transaction: Transaction, api: ApiPromise) => HashData;
  decodeCallData: (api: ApiPromise, accountId: Address, callData: CallData) => DecodedTransaction;
  verifySignature: (payload: Uint8Array, signature: HexString, accountId: AccountId) => Boolean;
  setTxs: (txs: Transaction[]) => void;
  txs: Transaction[];
  setWrappers: (wrappers: TxWrappers[]) => void;
  wrapTx: (tx: Transaction, api: ApiPromise, addressPrefix: number) => Transaction;
  buildTransaction: (
    type: TransactionType,
    address: Address,
    chainId: ChainId,
    args: Record<string, any>,
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

export type XcmPallet = 'xcmPallet' | 'polkadotXcm';

export interface XcmPalletTransferArgs extends Args {
  dest: AnyJson;
  beneficiary: AnyJson;
  assets: AnyJson;
  feeAssetItem: number;
  weightLimit: AnyJson;
}

export interface XTokenPalletTransferArgs extends Args {
  asset: AnyJson;
  dest: AnyJson;
  destWeightLimit?: AnyJson;
  destWeight?: number;
}
