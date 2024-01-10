import { MultisigTransaction } from '@entities/transaction/model/transaction';
import { MultisigTransactionDS, IMultisigTransactionStorage, TMultisigTransaction } from '../lib/types';
import { AccountId, CallHash, ChainId } from '@shared/core';

export const useTransactionStorage = (db: TMultisigTransaction): IMultisigTransactionStorage => ({
  getMultisigTx: (
    accountId: AccountId,
    chainId: ChainId,
    callHash: CallHash,
    blockCreated: number,
    indexCreated: number,
  ): Promise<MultisigTransactionDS | undefined> => {
    return db.get({ accountId, chainId, callHash, blockCreated, indexCreated });
  },

  getMultisigTxs: <T extends MultisigTransaction>(where?: Partial<T>): Promise<MultisigTransactionDS[]> => {
    return where ? db.where(where).toArray() : db.toArray();
  },

  getAccountMultisigTxs: (accountIds: AccountId[]): Promise<MultisigTransactionDS[]> => {
    return db.where('accountId').anyOf(accountIds).toArray();
  },

  addMultisigTx: async (tx: MultisigTransaction): Promise<void> => {
    try {
      await db.add(tx);
    } catch (error) {
      console.warn(
        `The same TX ${tx.accountId} ${tx.chainId} ${tx.callHash} ${tx.blockCreated} ${tx.indexCreated} already exists. Updating it ...`,
      );
      let rowsUpdate = await db.update(
        //@ts-ignore
        [tx.accountId, tx.chainId, tx.callHash, tx.blockCreated, tx.indexCreated],
        tx,
      );
      console.log(`${rowsUpdate} transaction updated!`);
    }
  },

  updateMultisigTx: (tx: MultisigTransactionDS): Promise<number> => {
    //@ts-ignore
    return db.update([tx.accountId, tx.chainId, tx.callHash, tx.blockCreated, tx.indexCreated], tx);
  },

  deleteMultisigTx: (
    accountId: AccountId,
    chainId: ChainId,
    callHash: CallHash,
    blockCreated: number,
    indexCreated: number,
  ): Promise<void> => {
    //@ts-ignore
    return db.delete([accountId, chainId, callHash, blockCreated, indexCreated]);
  },

  deleteMultisigTxs: (accountId: AccountId): Promise<number> => {
    return db.where('accountId').equals(accountId).delete();
  },
});
