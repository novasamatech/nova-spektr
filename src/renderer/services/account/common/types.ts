import { IndexableType } from 'dexie';

import { Account } from '@renderer/domain/account';
import { AccountID } from '@renderer/domain/shared-kernel';
import { AccountDS } from '@renderer/services/storage';

export interface IAccountService {
  getAccount: (accountId: AccountID) => Promise<AccountDS | undefined>;
  getAccounts: <T extends Account>(where?: Partial<T>) => Promise<AccountDS[]>;
  getActiveAccounts: <T extends Account>(where?: Partial<T>) => AccountDS[];
  getLiveAccounts: <T extends Account>(where?: Partial<T>) => AccountDS[];
  toggleActiveAccount: (accountId: IndexableType) => Promise<void>;
  addAccount: <T extends Account>(account: T) => Promise<IndexableType>;
  updateAccount: <T extends Account>(account: T) => Promise<IndexableType>;
  deleteAccount: (accountId: AccountID) => Promise<void>;
  getActiveMultisigAccounts: () => AccountDS[];
}
