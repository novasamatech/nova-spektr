import { IndexableType } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';

import storage, { AccountDS } from '@renderer/services/storage';
import { IAccountService } from './common/types';

export const useAccount = (): IAccountService => {
  const accountStorage = storage.connectTo('accounts');

  if (!accountStorage) {
    throw new Error('=== 🔴 Wallet storage in not defined 🔴 ===');
  }
  const { getAccount, getAccounts, addAccount, updateAccount, deleteAccount } = accountStorage;

  const getLiveAccounts = (where?: Record<string, any>) =>
    useLiveQuery((): Promise<AccountDS[]> => {
      try {
        return getAccounts(where);
      } catch (error) {
        console.warn('Error trying to get active wallet');

        return Promise.resolve([]);
      }
    });

  const getActiveAccounts = () =>
    useLiveQuery(async (): Promise<AccountDS[]> => {
      try {
        const accounts = await getAccounts();

        return accounts.filter((account) => account.isActive);
      } catch (error) {
        console.warn('Error trying to get active wallet');

        return [];
      }
    });

  // TODO: in future implement setWalletInactive
  const toggleActiveAccount = async (accountId: IndexableType): Promise<void> => {
    try {
      const newActiveAccount = await getAccount(accountId);
      if (newActiveAccount) {
        await updateAccount({
          ...newActiveAccount,
          isActive: !newActiveAccount.isActive,
        });
      } else {
        console.warn('Could not find wallet with such id');
      }
    } catch (error) {
      console.warn('Could not set new active wallet');
    }
  };

  return {
    getAccount,
    getAccounts,
    getLiveAccounts,
    getActiveAccounts,
    toggleActiveAccount,
    addAccount,
    updateAccount,
    deleteAccount,
  };
};
