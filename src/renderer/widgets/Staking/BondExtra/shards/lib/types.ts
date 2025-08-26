import { type Chain, type Wallet } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

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
  shards: AnyAccount[];
  chain: Chain;
};

export type BondExtraData = {
  shards: AnyAccount[];
  signatory: AnyAccount | null;
  amount: string;
};

export type FeeData = {
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
