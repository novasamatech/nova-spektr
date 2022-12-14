import { IndexableType } from 'dexie';

import { Account } from '@renderer/domain/account';
import { AccountID } from '@renderer/domain/shared-kernel';
import { AccountDS } from '@renderer/services/storage';

export interface IAccountService {
  getAccount: (accountId: AccountID) => Promise<AccountDS | undefined>;
  getAccounts: (where?: Record<string, any>) => Promise<AccountDS[]>;
  getActiveAccounts: () => AccountDS[];
  getLiveAccounts: (where?: Record<string, any>) => AccountDS[];
  toggleActiveAccount: (accountId: IndexableType) => Promise<void>;
  addAccount: (account: Account) => Promise<IndexableType>;
  updateAccount: (account: Account) => Promise<IndexableType>;
  deleteAccount: (accountId: AccountID) => Promise<void>;
}
