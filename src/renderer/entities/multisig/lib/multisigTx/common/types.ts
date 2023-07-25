import { ApiPromise } from '@polkadot/api';
import { U8aFixed } from '@polkadot/types';
import { PalletMultisigMultisig } from '@polkadot/types/lookup';
import { MultisigTransactionDS } from '@renderer/shared/api/storage';

import { MultisigAccount } from '@renderer/entities/account/model/account';
import { MultisigTransaction } from '@renderer/entities/transaction/model/transaction';
import { CallData, AccountId, ChainId, CallHash } from '@renderer/domain/shared-kernel';

export interface IMultisigTxService {
  subscribeMultisigAccount: (api: ApiPromise, account: MultisigAccount) => () => void;
  getMultisigTx: (
    accountId: AccountId,
    chainId: ChainId,
    callHash: CallHash,
    blockCreated: number,
    indexCreated: number,
  ) => Promise<MultisigTransactionDS | undefined>;
  getMultisigTxs: <T extends MultisigTransaction>(where?: Partial<T>) => Promise<MultisigTransactionDS[]>;
  getAccountMultisigTxs: (accountIds: AccountId[]) => Promise<MultisigTransactionDS[]>;
  getLiveMultisigTxs: <T extends MultisigTransaction>(where?: Partial<T>) => MultisigTransactionDS[];
  getLiveAccountMultisigTxs: (accountIds: AccountId[]) => MultisigTransactionDS[];
  addMultisigTx: (tx: MultisigTransaction) => Promise<void>;
  updateMultisigTx: (tx: MultisigTransaction) => Promise<number>;
  deleteMultisigTx: (
    accountId: AccountId,
    chainId: ChainId,
    callHash: CallHash,
    blockCreated: number,
    indexCreated: number,
  ) => Promise<void>;
  updateCallData: (api: ApiPromise, tx: MultisigTransaction, callData: CallData) => Promise<void>;
}

export type PendingMultisigTransaction = {
  callHash: U8aFixed;
  params: PalletMultisigMultisig;
};
