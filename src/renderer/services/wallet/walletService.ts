import { useLiveQuery } from 'dexie-react-hooks';

import storage, { WalletDS } from '@renderer/services/storage';
import { IWalletService } from './common/types';

export const useWallet = (): IWalletService => {
  const walletStorage = storage.connectTo('wallets');

  if (!walletStorage) {
    throw new Error('=== 🔴 Wallet storage in not defined 🔴 ===');
  }
  const { getWallet, getWallets, addWallet, updateWallet, deleteWallet } = walletStorage;

  const getLiveWallets = (where?: Record<string, any>) =>
    useLiveQuery((): Promise<WalletDS[]> => {
      try {
        return getWallets(where);
      } catch (error) {
        console.warn('Error trying to get active wallet');

        return Promise.resolve([]);
      }
    });

  return {
    getWallet,
    getWallets,
    getLiveWallets,
    addWallet,
    updateWallet,
    deleteWallet,
  };
};
