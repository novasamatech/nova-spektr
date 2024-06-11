import type { AccountId, Address, ID } from './general';

export type Contact = {
  id: ID;
  name: string;
  address: Address;
  accountId: AccountId;
  matrixId?: string;
};
