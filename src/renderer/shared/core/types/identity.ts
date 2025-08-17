import { type AccountId } from '@/shared/polkadotjs-schemas';

export type Identity = {
  subName: string;
  email: string;
  website: string;
  twitter: string;
  parent: ParentIdentity;
};

type ParentIdentity = {
  accountId: AccountId;
  name: string;
  // judgements: Judgement[];
};

// type Judgement = {
//   votes: number;
//   verdict: string;
// };

export type SubIdentity = {
  sub: AccountId;
  parent: AccountId;
  subName: string;
};
