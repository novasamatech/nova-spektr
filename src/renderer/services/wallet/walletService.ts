import storage from '@renderer/services/storage';
import { IWalletService } from './common/types';

export const useWallet = (): IWalletService => {
  const walletStorage = storage.connectTo('wallets');

  if (!walletStorage) {
    throw new Error('=== 🔴 Wallet storage in not defined 🔴 ===');
  }
  const { getWallet, getWallets, addWallet, updateWallet, deleteWallet } = walletStorage;

  // const createSimpleWallet = () => {
  //   console.log('createSimpleWallet');
  // };
  //
  // const createMultisigWallet = () => {
  //   console.log('createMultisigWallet');
  // };

  return {
    getWallet,
    getWallets,
    addWallet,
    updateWallet,
    deleteWallet,
  };
};
