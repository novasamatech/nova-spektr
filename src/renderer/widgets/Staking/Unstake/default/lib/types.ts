import { type Account, type Chain, type ProxiedAccount, type Wallet } from '@/shared/core';
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
  shards: Account[];
};

export type UnstakeStore = {
  route: AnyAccount[];
  signatory: AnyAccount;
  proxiedAccount?: ProxiedAccount;
  fee: string;
  totalFee: string;
  multisigDeposit: string;
  initiator: AnyAccount;
  amount: string;
};
