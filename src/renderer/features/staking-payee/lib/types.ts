import { type Address, type Chain, type Wallet } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
  BASKET,
}

export type FormInput = {
  wallet: Wallet;
  shards: AnyAccount[];
  chain: Chain;
};

export type WalletData = {
  wallet: Wallet;
  initiator: AnyAccount | null;
  chain: Chain;
};

export type WalletDataShards = {
  wallet: Wallet;
  shards: AnyAccount[];
  chain: Chain;
};

export type PayeeData = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  destination: Address;
};

export type PayeeDataShards = {
  shards: AnyAccount[];
  signatory: AnyAccount | null;
  destination: string;
};

export type FeeData = {
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
