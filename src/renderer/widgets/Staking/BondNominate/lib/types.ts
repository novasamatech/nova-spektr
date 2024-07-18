import { type Account, type Address, type Chain, type Validator, type Wallet } from '@shared/core';

export const enum Step {
  NONE,
  INIT,
  VALIDATORS,
  CONFIRM,
  SIGN,
  SUBMIT,
  BASKET,
}

export type WalletData = {
  wallet: Wallet;
  shards: Account[];
  chain: Chain;
};

export type BondNominateData = {
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
