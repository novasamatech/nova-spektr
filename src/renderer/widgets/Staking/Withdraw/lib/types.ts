import { type Account, type Chain, type ProxiedAccount } from '@/shared/core';

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
  shards: Account[];
};

export type WithdrawData = {
  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory: Account | null;
  amount: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
