import storage, { WalletDS } from '@renderer/services/storage';
import { IWalletService } from './common/types';

export const useWallet = (): IWalletService => {
  const walletStorage = storage.connectTo('wallets');

  if (!walletStorage) {
    throw new Error('=== 🔴 Wallet storage in not defined 🔴 ===');
  }
  const { getWallet, getWallets, addWallet, updateWallet, deleteWallet } = walletStorage;

  const getActiveWallets = async (): Promise<WalletDS[]> => {
    try {
      const wallets = await getWallets();

      return wallets.filter((wallet) => wallet.isActive);
    } catch (error) {
      console.warn('Error trying to get active wallet');

      return [];
    }
  };

  const setActiveWallet = async (walletId: string): Promise<void> => {
    try {
      const newActiveWallet = await getWallet(walletId);
      if (newActiveWallet) {
        await updateWallet({ ...newActiveWallet, isActive: true });
      }
    } catch (error) {
      console.warn('Could not set new active wallet');
    }
  };

  return {
    getWallet,
    getWallets,
    getActiveWallets,
    setActiveWallet,
    addWallet,
    updateWallet,
    deleteWallet,
  };
};
