import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { AccountID, HexString, CallData } from '@renderer/domain/shared-kernel';
import { Transaction } from '@renderer/domain/transaction';
import { Asset } from '@renderer/domain/asset';

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
    callback: (executed: boolean, params: any) => void,
  ) => void;
  getTransactionFee: (transaction: Transaction, api: ApiPromise) => Promise<string>;
  getTransactionDeposit: (threshold: number, api: ApiPromise) => string;
  getTransactionHash: (transaction: Transaction, api: ApiPromise) => HashData;
  decodeCallData: (api: ApiPromise, accountId: AccountID, assets: Asset[], callData: CallData) => Transaction;
};

// =====================================================
// ======================= General =====================
// =====================================================

export type HashData = {
  callData: HexString;
  callHash: HexString;
};
