import { ApiPromise } from '@polkadot/api';
import { U8aFixed } from '@polkadot/types';
import { PalletMultisigMultisig } from '@polkadot/types/lookup';

import { MultisigAccount } from '@renderer/domain/account';
import { MultisigTransactionDS, ID } from '@renderer/services/storage';
import { MultisigTransaction } from '@renderer/domain/transaction';
import { CallData, AccountId } from '@renderer/domain/shared-kernel';

export interface IMultisigTxService {
  subscribeMultisigAccount: (api: ApiPromise, account: MultisigAccount) => () => void;
  getMultisigTx: (txId: ID) => Promise<MultisigTransactionDS | undefined>;
  getMultisigTxs: <T extends MultisigTransaction>(where?: Partial<T>) => Promise<MultisigTransactionDS[]>;
  getAccountMultisigTxs: (accountIds: AccountId[]) => Promise<MultisigTransactionDS[]>;
  getLiveMultisigTxs: <T extends MultisigTransaction>(where?: Partial<T>) => MultisigTransactionDS[];
  getLiveAccountMultisigTxs: (accountIds: AccountId[]) => MultisigTransactionDS[];
  addMultisigTx: (tx: MultisigTransaction) => Promise<ID>;
  updateMultisigTx: (tx: MultisigTransaction) => Promise<ID>;
  deleteMultisigTx: (txId: ID) => Promise<void>;
  updateCallData: (api: ApiPromise, tx: MultisigTransaction, callData: CallData) => Promise<void>;
}

export type PendingMultisigTransaction = {
  callHash: U8aFixed;
  params: PalletMultisigMultisig;
};
