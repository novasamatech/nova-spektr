import { type Account, type Chain, type Wallet } from '@/shared/core';

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

export type BondExtraData = {
  shards: Account[];
  signatory: Account | null;
  amount: string;
};

export type FeeData = {
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
