import type { Account, Chain, Address, Wallet, Validator } from '@shared/core';

export const enum Step {
  NONE,
  INIT,
  VALIDATORS,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type WalletData = {
  wallet: Wallet;
  shards: Account[];
  chain: Chain;
};

export type BondData = {
  shards: Account[];
  signatory?: Account;
  amount: string;
  destination: Address;
  validators: Validator[];
  description: string;
};

export type FeeData = {
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
