import type { Account, Chain, Wallet, Validator } from '@shared/core';

export const enum Step {
  NONE,
  INIT,
  VALIDATORS,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type WalletData = {
  wallet: Wallet_NEW;
  shards: Account[];
  chain: Chain;
};

export type NominateData = {
  shards: Account[];
  signatory?: Account;
  validators: Validator[];
  description: string;
};

export type FeeData = {
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
