import type { Account, Address, Chain, Asset, ProxiedAccount } from '@shared/core';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type NetworkStore = {
  chain: Chain;
  asset: Asset;
};

export type UnstakeStore = {
  xcmChain: Chain;
  account: Account;
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  destination: Address;
  description: string;

  fee: string;
  xcmFee: string;
  multisigDeposit: string;
};
