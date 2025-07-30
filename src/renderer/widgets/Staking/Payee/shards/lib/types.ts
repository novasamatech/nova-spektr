import { type Account, type Address, type Chain, type Wallet } from '@/shared/core';

export const enum Step {
  NONE,
  INIT,
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

export type PayeeData = {
  shards: Account[];
  signatory: Account | null;
  destination: Address;
};

export type FeeData = {
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
