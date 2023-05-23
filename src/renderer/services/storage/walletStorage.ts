import { Wallet } from '@renderer/domain/wallet';
import { IWalletStorage, WalletDS, TWallet, ID } from './common/types';

export const useWalletStorage = (db: TWallet): IWalletStorage => ({
  getWallet: (walletId: ID): Promise<WalletDS | undefined> => {
    return db.get(walletId);
  },

  getWallets: <T extends Wallet>(where?: Partial<T>): Promise<WalletDS[]> => {
    return where ? db.where(where).toArray() : db.toArray();
  },

  addWallet: (wallet: Wallet): Promise<ID> => {
    return db.add(wallet);
  },

  updateWallet: (wallet: Wallet): Promise<ID> => {
    return db.put(wallet);
  },

  deleteWallet: (walletId: string): Promise<void> => {
    return db.delete(walletId);
  },
});
