import { Account } from './account';

export type Contact = {
  name?: string;
  mainAccounts: Account[];
  messengerUserId: string;

  // may be used in future
  // chainAccounts: ChainAccount[];
};
