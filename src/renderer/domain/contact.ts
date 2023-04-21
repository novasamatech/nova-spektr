import { AccountId, Address } from './shared-kernel';

export type Contact = {
  name: string;
  address: Address;
  accountId: AccountId;
  matrixId?: string;
};
