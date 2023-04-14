import { useLiveQuery } from 'dexie-react-hooks';
import { IndexableType } from 'dexie';

import storage, { AccountDS } from '@renderer/services/storage';
import { IAccountService } from './common/types';
import { MultisigAccount, Account } from '@renderer/domain/account';

export const useAccount = (): IAccountService => {
  const accountStorage = storage.connectTo('accounts');

  if (!accountStorage) {
    throw new Error('=== 🔴 Wallet storage in not defined 🔴 ===');
  }
  const { getAccount, getAccounts, addAccount, updateAccount, deleteAccount } = accountStorage;

  const getLiveAccounts = <T extends Account>(where?: Partial<T>): AccountDS[] => {
    const query = () => {
      try {
        return getAccounts(where);
      } catch (error) {
        console.warn('Error trying to get accounts');

        return Promise.resolve([]);
      }
    };

    return useLiveQuery(query, [], []);
  };

  const getActiveAccounts = <T extends Account>(where?: Partial<T>): AccountDS[] => {
    const query = async () => {
      try {
        const accounts = await getAccounts(where);

        return accounts.filter((account) => account.isActive);
      } catch (error) {
        console.warn('Error trying to get active accounts');

        return Promise.resolve([]);
      }
    };

    return useLiveQuery(query, [], []);
  };

  const getActiveMultisigAccounts = (): AccountDS[] => {
    const query = async () => {
      try {
        const accounts = await getAccounts();

        return accounts.filter(
          (account) => account.isActive && (account as MultisigAccount).inviterPublicKey !== undefined,
        );
      } catch (error) {
        console.warn('Error trying to get active multisig accounts');

        return Promise.resolve([]);
      }
    };

    return useLiveQuery(query, [], []);
  };

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
    getActiveMultisigAccounts,
    toggleActiveAccount,
    addAccount,
    updateAccount,
    deleteAccount,
  };
};
