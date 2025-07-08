import { type Chain, type ProxiedAccount } from '@/shared/core';
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

export type WithdrawData = {
  shards: AnyAccount[];
  proxiedAccount?: ProxiedAccount;
  signatory: AnyAccount | null;
  amount: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
