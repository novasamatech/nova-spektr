import { ApiPromise } from '@polkadot/api';
import { U8aFixed } from '@polkadot/types';
import { PalletMultisigMultisig } from '@polkadot/types/lookup';
import { IndexableType } from 'dexie';

import { MultisigAccount } from '@renderer/domain/account';
import { MultisigTransactionDS } from '@renderer/services/storage';
import { MultisigTransaction } from '@renderer/domain/transaction';
import { PublicKey } from '@renderer/domain/shared-kernel';

export interface IMultisigTxService {
  subscribeMultisigAccount: (api: ApiPromise, account: MultisigAccount) => () => void;
  getMultisigTx: (txId: IndexableType) => Promise<MultisigTransactionDS | undefined>;
  getMultisigTxs: (where?: Record<string, any>) => Promise<MultisigTransactionDS[]>;
  getAccountMultisigTxs: (publicKeys: PublicKey[]) => Promise<MultisigTransactionDS[]>;
  getLiveMultisigTxs: (where?: Record<string, any>) => MultisigTransactionDS[];
  getLiveAccountMultisigTxs: (publicKeys: PublicKey[]) => MultisigTransactionDS[];
  addMultisigTx: (tx: MultisigTransaction) => Promise<IndexableType>;
  updateMultisigTx: (tx: MultisigTransactionDS) => Promise<IndexableType>;
  deleteMultisigTx: (txId: IndexableType) => Promise<void>;
}

export type PendingMultisigTransaction = {
  callHash: U8aFixed;
  params: PalletMultisigMultisig;
};
