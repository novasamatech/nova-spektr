import { type Chain, type Wallet } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
  BASKET,
}

export type NetworkStore = {
  wallet: Wallet;
  chain: Chain;
  shards: AnyAccount[];
};

export type UnstakeStore = {
  route: AnyAccount[];
  signatory: AnyAccount;
  fee: string;
  totalFee: string;
  multisigDeposit: string;
  initiator: AnyAccount;
  amount: string;
};
