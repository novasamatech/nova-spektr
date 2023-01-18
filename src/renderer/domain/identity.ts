import { AccountID } from '@renderer/domain/shared-kernel';

export type Identity = {
  subName: string;
  email: string;
  website: string;
  twitter: string;
  riot: string;
  parent: ParentIdentity;
};

type ParentIdentity = {
  address: AccountID;
  name: string;
  // judgements: Judgement[];
};

// type Judgement = {
//   votes: number;
//   verdict: string;
// };

export type SubIdentity = {
  sub: AccountID;
  parent: AccountID;
  subName: string;
};
