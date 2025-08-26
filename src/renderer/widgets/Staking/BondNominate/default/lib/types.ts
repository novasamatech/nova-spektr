import { type Address, type Chain, type Validator, type Wallet } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

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
  shards: AnyAccount[];
  chain: Chain;
};

export type BondNominateData = {
  initiator: AnyAccount;
  signatory: AnyAccount;
  amount: string;
  destination: Address;
  validators: Validator[];
};
