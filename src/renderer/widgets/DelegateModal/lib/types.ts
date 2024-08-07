import { type Account, type Address, type Chain, type Wallet } from '@shared/core';

export type WalletData = {
  wallet: Wallet;
  chain: Chain;
};

export type DelegateData = {
  shards: Account[];
  signatory?: Account;
  tracks: number[];
  target: Address;
  conviction: number;
  balance: string;
  description: string;
};

export type FeeData = {
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
