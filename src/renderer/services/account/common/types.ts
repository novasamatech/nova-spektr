import { Account } from '@renderer/domain/account';
import { Address } from '@renderer/domain/shared-kernel';
import { AccountDS, ID } from '@renderer/services/storage';

export interface IAccountService {
  getAccount: (accountId: Address) => Promise<AccountDS | undefined>;
  getAccounts: <T extends Account>(where?: Partial<T>) => Promise<AccountDS[]>;
  getActiveAccounts: <T extends Account>(where?: Partial<T>) => AccountDS[];
  getLiveAccounts: <T extends Account>(where?: Partial<T>) => AccountDS[];
  addAccount: <T extends Account>(account: T, deactivateOld?: boolean) => Promise<ID>;
  updateAccount: <T extends Account>(account: T) => Promise<ID>;
  deleteAccount: (accountId: Address) => Promise<void>;
  getActiveMultisigAccount: () => AccountDS | null;
  setActiveAccounts: (accountsId: ID[]) => Promise<void>;
  setActiveAccount: (accountId: ID) => Promise<void>;
  deactivateAccounts: <T extends Account>(accounts: T[]) => Promise<void>;
}
