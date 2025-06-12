import { type BN } from '@polkadot/util';

import { type Account, type Address, type Chain, type Conviction, type Wallet } from '@/shared/core';

export type WalletData = {
  wallet: Wallet;
  chain: Chain;
};

export type DelegateData = {
  shards: Account[];
  signatory: Account | null;
  tracks: number[];
  target: Address;
  conviction: Conviction;
  balance: string;
  locks: Record<string, BN>;
};

export type FeeData = {
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
