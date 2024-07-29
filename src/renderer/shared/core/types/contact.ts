import { type AccountId, type Address, type ID } from './general';

export type Contact = {
  id: ID;
  name: string;
  address: Address;
  accountId: AccountId;
};
