import { IndexableType } from 'dexie';

import { AccountDS } from '@renderer/services/storage';
import { Account } from '@renderer/domain/account';

export interface IAccountService {
  getAccount: (accountId: string) => Promise<AccountDS | undefined>;
  getAccounts: (where?: Record<string, any>) => Promise<AccountDS[]>;
  getActiveAccounts: () => AccountDS[] | undefined;
  getLiveAccounts: (where?: Record<string, any>) => AccountDS[] | undefined;
  toggleActiveAccount: (accountId: IndexableType) => Promise<void>;
  addAccount: (account: Account) => Promise<IndexableType>;
  updateAccount: (account: Account) => Promise<IndexableType>;
  deleteAccount: (accountId: string) => Promise<void>;
}
