import type { Account, Chain, ProxiedAccount, Wallet } from '@shared/core';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type NetworkStore = {
  wallet: Wallet;
  chain: Chain;
  shards: Account[];
};

export type UnstakeStore = {
  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  description: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
