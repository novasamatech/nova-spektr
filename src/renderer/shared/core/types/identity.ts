import { type Address } from './general';

export type Identity = {
  subName: string;
  email: string;
  website: string;
  twitter: string;
  parent: ParentIdentity;
};

type ParentIdentity = {
  address: Address;
  name: string;
  // judgements: Judgement[];
};

// type Judgement = {
//   votes: number;
//   verdict: string;
// };

export type SubIdentity = {
  sub: Address;
  parent: Address;
  subName: string;
};
