import { type Chain, type ProxiedAccount, type Wallet } from '@/shared/core';
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

export type WithdrawData = {
  initiator: AnyAccount | null;
  proxiedAccount?: ProxiedAccount;
  signatory: AnyAccount | null;
  amount: string;
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};

export type WithdrawDataShards = {
  shards: AnyAccount[];
  proxiedAccount?: ProxiedAccount;
  signatory: AnyAccount | null;
  amount: string;
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
