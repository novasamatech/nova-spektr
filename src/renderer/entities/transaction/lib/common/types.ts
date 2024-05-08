import { ApiPromise } from '@polkadot/api';
import { Args } from '@substrate/txwrapper-polkadot';
import { Weight } from '@polkadot/types/interfaces';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { AnyJson } from '@polkadot/types/types';

import type {
  Address,
  CallData,
  HexString,
  Timepoint,
  AccountId,
  ChainId,
  MultisigAccount,
  ProxiedAccount,
  Account,
} from '@shared/core';
import { DecodedTransaction, Transaction, TransactionType } from '@entities/transaction/model/transaction';

// =====================================================
// =========== ITransactionService interface ===========
// =====================================================

export type ITransactionService = {
  getExtrinsicWeight: (extrinsic: SubmittableExtrinsic<'promise'>) => Promise<Weight>;
  getTxWeight: (transaction: Transaction, api: ApiPromise) => Promise<Weight>;
  getTransactionHash: (transaction: Transaction, api: ApiPromise) => HashData;
  decodeCallData: (api: ApiPromise, accountId: Address, callData: CallData) => DecodedTransaction;
  verifySignature: (payload: Uint8Array, signature: HexString, accountId: AccountId) => Boolean;
  setTxs: (txs: Transaction[]) => void;
  txs: Transaction[];
  setWrappers: (wrappers: TxWrappers_OLD[]) => void;
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

export const enum WrapperKind {
  MULTISIG = 'multisig',
  PROXY = 'proxy',
}

export type MultisigTxWrapper = {
  kind: WrapperKind.MULTISIG;
  multisigAccount: MultisigAccount;
  signatories: Account[];
  signer: Account;
};

export type ProxyTxWrapper = {
  kind: WrapperKind.PROXY;
  proxyAccount: Account;
  proxiedAccount: ProxiedAccount;
};

export type TxWrapper = MultisigTxWrapper | ProxyTxWrapper;

export type WrapAsMulti = {
  account: MultisigAccount;
  signatoryId: AccountId;
};

export type TxWrappers_OLD = WrapAsMulti;
