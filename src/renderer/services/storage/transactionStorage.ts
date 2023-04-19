import { MultisigTransaction } from '@renderer/domain/transaction';
import { MultisigTransactionDS, IMultisigTransactionStorage, TMultisigTransaction, ID } from './common/types';
import { AccountID } from '@renderer/domain/shared-kernel';

export const useTransactionStorage = (db: TMultisigTransaction): IMultisigTransactionStorage => ({
  getMultisigTx: (txId: ID): Promise<MultisigTransactionDS | undefined> => {
    return db.get(txId);
  },

  getMultisigTxs: <T extends MultisigTransaction>(where?: Partial<T>): Promise<MultisigTransactionDS[]> => {
    return where ? db.where(where).toArray() : db.toArray();
  },

  getAccountMultisigTxs: (accountIds: AccountID[]): Promise<MultisigTransactionDS[]> => {
    return db.where('accountId').anyOf(accountIds).toArray();
  },

  addMultisigTx: (tx: MultisigTransaction): Promise<ID> => {
    return db.add(tx);
  },

  updateMultisigTx: (tx: MultisigTransactionDS): Promise<ID> => {
    return db.put(tx);
  },

  deleteMultisigTx: (txId: ID): Promise<void> => {
    return db.delete(txId);
  },
});
