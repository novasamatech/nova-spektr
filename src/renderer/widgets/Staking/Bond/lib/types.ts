import type { Account, Chain, ProxiedAccount, Address } from '@shared/core';

export const enum Step {
  NONE,
  INIT,
  VALIDATORS,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type NetworkStore = {
  chain: Chain;
  shards: Account[];
};

export type BondStore = {
  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  destination: Address;
  nominators: Address[];
  description: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
