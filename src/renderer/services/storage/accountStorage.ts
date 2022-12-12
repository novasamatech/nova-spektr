import { IndexableType, Table } from 'dexie';

import { AccountDS, IAccountStorage } from './common/types';
import { Account } from '@renderer/domain/account';

export const useAccountStorage = (db: Table<AccountDS>): IAccountStorage => ({
  getAccount: (walletId: IndexableType): Promise<AccountDS | undefined> => {
    return db.get(walletId);
  },

  getAccounts: (where: Record<string, any> | undefined): Promise<AccountDS[]> => {
    if (where) {
      return db.where(where).toArray();
    }

    return db.toArray();
  },

  addAccount: (wallet: Account): Promise<IndexableType> => {
    return db.add(wallet);
  },

  updateAccount: (account: Account): Promise<IndexableType> => {
    return db.put(account);
  },

  deleteAccount: (accoundId: string): Promise<void> => {
    return db.delete(accoundId);
  },
});
