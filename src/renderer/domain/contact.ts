import { AccountID, Address } from './shared-kernel';

export type Contact = {
  name: string;
  address: Address;
  accountId: AccountID;
  matrixId?: string;
};
