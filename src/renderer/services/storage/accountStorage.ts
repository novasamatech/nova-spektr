import { IndexableType, Table } from 'dexie';

import { Account } from '@renderer/domain/account';
import { AccountID } from '@renderer/domain/shared-kernel';
import { AccountDS, IAccountStorage } from './common/types';

export const useAccountStorage = (db: Table<AccountDS>): IAccountStorage => ({
  getAccount: (accountId: IndexableType): Promise<AccountDS | undefined> => {
    return db.get(accountId);
  },

  getAccounts: <T extends Account>(where?: Partial<T>): Promise<AccountDS[]> => {
    return where ? db.where(where).toArray() : db.toArray();
  },

  addAccount: <T extends Account>(account: T): Promise<IndexableType> => {
    return db.add(account);
  },

  updateAccount: <T extends Account>(account: T): Promise<IndexableType> => {
    return db.put(account);
  },

  deleteAccount: (accountId: AccountID): Promise<void> => {
    return db.delete(accountId);
  },
});
