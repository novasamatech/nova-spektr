import { useLiveQuery } from 'dexie-react-hooks';

import storage, { WalletDS } from '@renderer/shared/api/storage';
import { IWalletService } from './common/types';
import { Wallet } from '@renderer/entities/wallet/model/wallet';

export const useWallet = (): IWalletService => {
  const walletStorage = storage.connectTo('wallets');

  if (!walletStorage) {
    throw new Error('=== 🔴 Wallet storage in not defined 🔴 ===');
  }
  const { getWallet, getWallets, addWallet, updateWallet, deleteWallet } = walletStorage;

  const getLiveWallets = <T extends Wallet>(where?: Partial<T>): WalletDS[] => {
    const query = () => {
      try {
        return getWallets(where);
      } catch (error) {
        console.warn('Error trying to get active wallet');

        return Promise.resolve([]);
      }
    };

    return useLiveQuery(query, [], []);
  };

  return {
    getWallet,
    getWallets,
    getLiveWallets,
    addWallet,
    updateWallet,
    deleteWallet,
  };
};
