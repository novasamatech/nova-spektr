import { IndexableType, Table } from 'dexie';

import { MultisigTransaction } from '@renderer/domain/transaction';
import { MultisigTransactionDS, ITransactionStorage } from './common/types';

export const useTransactionStorage = (db: Table<MultisigTransactionDS>): ITransactionStorage => ({
  getTx: (txId: IndexableType): Promise<MultisigTransactionDS | undefined> => {
    return db.get(txId);
  },

  getTxs: (where?: Record<string, any>): Promise<MultisigTransactionDS[]> => {
    if (where) {
      return db.where(where).toArray();
    }

    return db.toArray();
  },

  addTx: (tx: MultisigTransaction): Promise<IndexableType> => {
    return db.add(tx);
  },

  updateTx: (tx: MultisigTransactionDS): Promise<IndexableType> => {
    return db.put(tx);
  },

  deleteTx: (txId: IndexableType): Promise<void> => {
    return db.delete(txId);
  },
});
