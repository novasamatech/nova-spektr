import { type Chain, type Wallet } from '@/shared/core';
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

export type FormSubmitEvent = {
  chain: Chain;
  route: AnyAccount[];
  signatory: AnyAccount;
  fee: string;
  totalFee: string;
  multisigDeposit: string;
  initiator: AnyAccount;
};
