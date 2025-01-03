import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type Address } from './general';

export type Signatory = {
  name?: string;
  address: Address;
  accountId: AccountId;
  id?: number;
};
