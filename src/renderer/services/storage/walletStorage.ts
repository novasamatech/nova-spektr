import { IndexableType, Table } from 'dexie';

import { Wallet } from '@renderer/domain/wallet';
import { IWalletStorage, WalletDS } from './common/types';

export const useWalletStorage = (db: Table<WalletDS>): IWalletStorage => ({
  getWallet: (walletId: string): Promise<WalletDS | undefined> => {
    return db.get(walletId);
  },

  getWallets: (): Promise<WalletDS[]> => {
    return db.toArray();
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
