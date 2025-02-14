import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type AccountIdentity = {
  accountId: AccountId;
  name: string;
  email: string;
  image: string;
};

export type IdentityMap = Record<ChainId, Record<AccountId, AccountIdentity>>;
