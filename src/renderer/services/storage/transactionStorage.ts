import { MultisigTransaction } from '@renderer/domain/transaction';
import { MultisigTransactionDS, IMultisigTransactionStorage, TMultisigTransaction, ID } from './common/types';
import { AccountId, CallHash, ChainId } from '@renderer/domain/shared-kernel';

export const useTransactionStorage = (db: TMultisigTransaction): IMultisigTransactionStorage => ({
  getMultisigTx: (
    accountId: AccountId,
    chainId: ChainId,
    callHash: CallHash,
    blockCreated: number,
    indexCreated: number,
  ): Promise<MultisigTransactionDS | undefined> => {
    return db.get([accountId, chainId, callHash, blockCreated, indexCreated]);
  },

  getMultisigTxs: <T extends MultisigTransaction>(where?: Partial<T>): Promise<MultisigTransactionDS[]> => {
    return where ? db.where(where).toArray() : db.toArray();
  },

  getAccountMultisigTxs: (accountIds: AccountId[]): Promise<MultisigTransactionDS[]> => {
    return db.where('accountId').anyOf(accountIds).toArray();
  },

  addMultisigTx: async (tx: MultisigTransaction): Promise<void> => {
    try {
      await db.add(tx); //todo it's not correct. The error handling should be here.
    } catch (error) {
      console.warn(`The same TX ${tx.callHash} already exists. Updating it.`);
      await db.update([tx.accountId, tx.chainId, tx.callHash, String(tx.blockCreated), String(tx.indexCreated)], tx);
    }
  },

  updateMultisigTx: (tx: MultisigTransactionDS): Promise<ID[]> => {
    return db.put(tx);
  },

  deleteMultisigTx: (
    accountId: AccountId,
    chainId: ChainId,
    callHash: CallHash,
    blockCreated: number,
    indexCreated: number,
  ): Promise<void> => {
    return db.delete([accountId, chainId, callHash, String(blockCreated), String(indexCreated)]);
  },
});
