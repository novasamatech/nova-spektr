import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type AccountIdentity = {
  accountId: AccountId;
  name: string;
  subName?: string;
  email: string;
  image: string;
  github?: string;
  matrix?: string;
};

export type IdentityMap = Record<ChainId, Record<AccountId, AccountIdentity>>;
