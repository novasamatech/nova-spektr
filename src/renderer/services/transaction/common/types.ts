import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { HexString } from '@renderer/domain/shared-kernel';
import { Transaction } from '@renderer/domain/transaction';

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
  submitAndWatchExtrinsic: (tx: string, api: ApiPromise, callback: (executed: boolean, params: any) => void) => void;
  getTransactionFee: (transaction: Transaction, api: ApiPromise) => Promise<string>;
};

// =====================================================
// ======================= General =====================
// =====================================================
