import { IndexableType, Table } from 'dexie';

import { MultisigTransaction } from '@renderer/domain/transaction';
import { MultisigTransactionDS, IMultisigTransactionStorage } from './common/types';
import { PublicKey } from '@renderer/domain/shared-kernel';

export const useTransactionStorage = (db: Table<MultisigTransactionDS>): IMultisigTransactionStorage => ({
  getMultisigTx: (txId: IndexableType): Promise<MultisigTransactionDS | undefined> => {
    return db.get(txId);
  },

  getMultisigTxs: (where?: Record<string, any>): Promise<MultisigTransactionDS[]> => {
    if (where) {
      return db.where(where).toArray();
    }

    return db.toArray();
  },

  getAccountMultisigTxs: (publicKeys: PublicKey[]): Promise<MultisigTransactionDS[]> => {
    return db.where('publicKey').anyOf(publicKeys).toArray();
  },

  addMultisigTx: (tx: MultisigTransaction): Promise<IndexableType> => {
    return db.add(tx);
  },

  updateMultisigTx: (tx: MultisigTransactionDS): Promise<IndexableType> => {
    return db.put(tx);
  },

  deleteMultisigTx: (txId: IndexableType): Promise<void> => {
    return db.delete(txId);
  },
});
