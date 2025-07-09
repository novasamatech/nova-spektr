import { type Chain } from '@/shared/core';
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
  chain: Chain;
  shards: AnyAccount[];
};

export type RestakeStore = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  amount: string;
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
