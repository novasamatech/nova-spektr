import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type Address, type ID } from './general';

export type Contact = {
  id: ID;
  name: string;
  address: Address;
  accountId: AccountId;
};
