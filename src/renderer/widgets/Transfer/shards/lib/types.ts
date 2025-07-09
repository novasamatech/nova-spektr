import { type Account, type Address, type Asset, type Chain, type ProxiedAccount } from '@/shared/core';

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
  asset: Asset;
};

export type TransferStore = {
  xcmChain: Chain;
  account: Account;
  proxiedAccount?: ProxiedAccount;
  signatory: Account | null;
  amount: string;
  destination: Address;

  fee: string;
  xcmFee: string;
  multisigDeposit: string;
};

export type BalanceMap = Record<'balance' | 'native', string>;
