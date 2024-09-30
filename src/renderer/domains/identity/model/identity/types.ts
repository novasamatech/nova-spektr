import { type AccountId } from '@/shared/polkadotjs-schemas';

export type AccountIdentity = {
  accountId: AccountId;
  name: string;
  email: string;
  image: string;
};
