import { ApiPromise } from '@polkadot/api';
import { U8aFixed } from '@polkadot/types';
import { PalletMultisigMultisig } from '@polkadot/types/lookup';
import { IndexableType } from 'dexie';

import { MultisigAccount } from '@renderer/domain/account';
import { MultisigTransactionDS } from '@renderer/services/storage';
import { MultisigTransaction } from '@renderer/domain/transaction';
import { CallData, PublicKey } from '@renderer/domain/shared-kernel';

export interface IMultisigTxService {
  subscribeMultisigAccount: (api: ApiPromise, account: MultisigAccount) => () => void;
  getMultisigTx: (txId: IndexableType) => Promise<MultisigTransactionDS | undefined>;
  getMultisigTxs: <T extends MultisigTransaction>(where?: Partial<T>) => Promise<MultisigTransactionDS[]>;
  getAccountMultisigTxs: (publicKeys: PublicKey[]) => Promise<MultisigTransactionDS[]>;
  getLiveMultisigTxs: <T extends MultisigTransaction>(where?: Partial<T>) => MultisigTransactionDS[];
  getLiveAccountMultisigTxs: (publicKeys: PublicKey[]) => MultisigTransactionDS[];
  addMultisigTx: (tx: MultisigTransaction) => Promise<IndexableType>;
  updateMultisigTx: (tx: MultisigTransactionDS) => Promise<IndexableType>;
  deleteMultisigTx: (txId: IndexableType) => Promise<void>;
  updateCallData: (api: ApiPromise, tx: MultisigTransactionDS, callData: CallData) => Promise<void>;
}

export type PendingMultisigTransaction = {
  callHash: U8aFixed;
  params: PalletMultisigMultisig;
};
