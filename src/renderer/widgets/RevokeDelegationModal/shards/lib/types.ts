import { type BN } from '@polkadot/util';

import { type Account, type Address, type Chain, type Wallet } from '@/shared/core';

export type WalletData = {
  wallet: Wallet;
  chain: Chain;
};

export type RevokeDelegationData = {
  target: Address;
  account: Account;
  signatory: Account | null;
  tracks: number[];
  locks: Record<string, BN>;
};

export type FeeData = {
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
