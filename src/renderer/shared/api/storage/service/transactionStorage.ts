import { type CallHash, type ChainId, type MultisigTransaction } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type IMultisigTransactionStorage, type MultisigTransactionDS, type TMultisigTransaction } from '../lib/types';

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
    } catch {
      console.warn(
        `The same TX ${tx.accountId} ${tx.chainId} ${tx.callHash} ${tx.blockCreated} ${tx.indexCreated} already exists. Updating it ...`,
      );
      const rowsUpdate = await db.update(
        //@ts-expect-error tx.blockCreated and tx.indexCreated are not defined in types
        [tx.accountId, tx.chainId, tx.callHash, tx.blockCreated, tx.indexCreated],
        tx,
      );
      console.log(`${rowsUpdate} transaction updated!`);
    }
  },

  updateMultisigTx: (tx: MultisigTransactionDS): Promise<number> => {
    //@ts-expect-error tx.blockCreated and tx.indexCreated are not defined in types
    return db.update([tx.accountId, tx.chainId, tx.callHash, tx.blockCreated, tx.indexCreated], tx);
  },

  deleteMultisigTx: (
    accountId: AccountId,
    chainId: ChainId,
    callHash: CallHash,
    blockCreated: number,
    indexCreated: number,
  ): Promise<void> => {
    //@ts-expect-error blockCreated and indexCreated are not defined in types
    return db.delete([accountId, chainId, callHash, blockCreated, indexCreated]);
  },

  deleteMultisigTxs: (accountId: AccountId): Promise<number> => {
    return db.where('accountId').equals(accountId).delete();
  },
});
