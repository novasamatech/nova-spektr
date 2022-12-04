import { IndexableType } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';

import storage, { WalletDS } from '@renderer/services/storage';
import { IWalletService } from './common/types';

export const useWallet = (): IWalletService => {
  const walletStorage = storage.connectTo('wallets');

  if (!walletStorage) {
    throw new Error('=== 🔴 Wallet storage in not defined 🔴 ===');
  }
  const { getWallet, getWallets, getWalletsByIds, addWallet, updateWallet, deleteWallet } = walletStorage;

  const getLiveWallets = (where?: Record<string, any>) =>
    useLiveQuery((): Promise<WalletDS[]> => {
      try {
        return getWallets(where);
      } catch (error) {
        console.warn('Error trying to get active wallet');

        return Promise.resolve([]);
      }
    });

  const getActiveWallets = () =>
    useLiveQuery(async (): Promise<WalletDS[]> => {
      try {
        const wallets = await getWallets();

        return wallets.filter((wallet) => wallet.isActive);
      } catch (error) {
        console.warn('Error trying to get active wallet');

        return [];
      }
    });

  // TODO: in future implement setWalletInactive
  const toggleActiveWallet = async (walletId: IndexableType): Promise<void> => {
    try {
      const newActiveWallet = await getWallet(walletId);
      if (newActiveWallet) {
        await updateWallet({ ...newActiveWallet, isActive: !newActiveWallet.isActive });
      } else {
        console.warn('Could not find wallet with such id');
      }
    } catch (error) {
      console.warn('Could not set new active wallet');
    }
  };

  return {
    getWallet,
    getWallets,
    getWalletsByIds,
    getLiveWallets,
    getActiveWallets,
    toggleActiveWallet,
    addWallet,
    updateWallet,
    deleteWallet,
  };
};
