import { type AccountId, type Address } from './general';

export type Signatory = {
  name?: string;
  address: Address;
  accountId: AccountId;
};
