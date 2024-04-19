import type { Account, Chain, Address, Wallet } from '@shared/core';

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

export type PayeeData = {
  shards: Account[];
  signatory?: Account;
  destination: Address;
  description: string;
};

export type FeeData = {
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
