import type { Account, Chain, Wallet } from '@shared/core';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type WalletData = {
  wallet: Wallet_NEW;
  shards: Account[];
  chain: Chain;
};

export type BondExtraData = {
  shards: Account[];
  signatory?: Account;
  amount: string;
  description: string;
};

export type FeeData = {
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
