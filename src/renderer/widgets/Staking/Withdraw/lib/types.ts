import type { Account, Chain, ProxiedAccount } from '@shared/core';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type NetworkStore = {
  chain: Chain;
  shards: Account[];
};

export type WithdrawData = {
  shards: BaseAccount[];
  proxiedAccount?: ProxiedAccount;
  signatory?: BaseAccount;
  amount: string;
  description: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
