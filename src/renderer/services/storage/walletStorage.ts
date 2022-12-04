import { IndexableType, Table } from 'dexie';

import { Wallet } from '@renderer/domain/wallet';
import { IWalletStorage, WalletDS } from './common/types';

export const useWalletStorage = (db: Table<WalletDS>): IWalletStorage => ({
  getWallet: (walletId: IndexableType): Promise<WalletDS | undefined> => {
    return db.get(walletId);
  },

  getWallets: (where: Record<string, any> | undefined): Promise<WalletDS[]> => {
    if (where) {
      return db.where(where).toArray();
    }

    return db.toArray();
  },

  getWalletsByIds: (walletsIds: IndexableType[]): Promise<WalletDS[]> => {
    return db.filter((wallet) => (wallet.id ? walletsIds.includes(wallet.id) : false)).toArray();
  },

  addWallet: (wallet: Wallet): Promise<IndexableType> => {
    return db.add(wallet);
  },

  updateWallet: (wallet: Wallet): Promise<IndexableType> => {
    return db.put(wallet);
  },

  deleteWallet: (walletId: string): Promise<void> => {
    return db.delete(walletId);
  },
});
