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

export type NetworkStore = {
  wallet: Wallet;
  chain: Chain;
  shards: AnyAccount[];
};

export type WalletData = {
  wallet: Wallet;
  initiator: AnyAccount | null;
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
