import { Account } from '@renderer/domain/account';
import { Address } from '@renderer/domain/shared-kernel';
import { AccountDS, IAccountStorage, TAccount, ID } from './common/types';

export const useAccountStorage = (db: TAccount): IAccountStorage => ({
  getAccount: (accountId: ID): Promise<AccountDS | undefined> => {
    return db.get(accountId);
  },

  getAccounts: <T extends Account>(where?: Partial<T>): Promise<AccountDS[]> => {
    return where ? db.where(where).toArray() : db.toArray();
  },

  addAccount: <T extends Account>(account: T): Promise<ID> => {
    return db.add(account);
  },

  updateAccount: <T extends Account>(account: T): Promise<ID> => {
    return db.put(account);
  },

  deleteAccount: (accountId: Address): Promise<void> => {
    return db.delete(accountId);
  },
});
