import { type AccountId } from '@/shared/polkadotjs-schemas';

export type Signatory = {
  name?: string;
  accountId: AccountId;
  id?: number;
};
