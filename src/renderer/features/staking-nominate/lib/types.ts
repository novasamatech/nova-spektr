import { type Chain, type Validator, type Wallet } from '@/shared/core';
import { type PathNode } from '@/domains/backend';
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
  signingPath: PathNode[];
};

export type NominateData = {
  shards: AnyAccount[];
  signatory: AnyAccount | null;
  validators: Validator[];
};

export type FeeData = {
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
