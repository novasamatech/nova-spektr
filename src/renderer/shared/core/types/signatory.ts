import type { AccountId, Address } from './general';

export type Signatory = {
  name?: string;
  address: Address;
  accountId: AccountId;
};
