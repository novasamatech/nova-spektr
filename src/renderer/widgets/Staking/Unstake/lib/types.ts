import { type Account, type Chain, type ProxiedAccount, type Wallet } from '@/shared/core';

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
  shards: Account[];
};

export type UnstakeStore = {
  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory: Account | null;
  amount: string;
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
