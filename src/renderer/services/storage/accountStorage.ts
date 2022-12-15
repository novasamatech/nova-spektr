import { IndexableType, Table } from 'dexie';

import { Account } from '@renderer/domain/account';
import { AccountID } from '@renderer/domain/shared-kernel';
import { AccountDS, IAccountStorage } from './common/types';

export const useAccountStorage = (db: Table<AccountDS>): IAccountStorage => ({
  getAccount: (accountId: IndexableType): Promise<AccountDS | undefined> => {
    return db.get(accountId);
  },

  getAccounts: (where?: Record<string, any>): Promise<AccountDS[]> => {
    if (where) {
      return db.where(where).toArray();
    }

    return db.toArray();
  },

  addAccount: (account: Account): Promise<IndexableType> => {
    return db.add(account);
  },

  updateAccount: (account: Account): Promise<IndexableType> => {
    return db.put(account);
  },

  deleteAccount: (accountId: AccountID): Promise<void> => {
    return db.delete(accountId);
  },
});
