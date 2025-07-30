import { type BN } from '@polkadot/util';

import { type Address, type Chain, type Wallet } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

export type WalletData = {
  wallet: Wallet;
  chain: Chain;
};

export type RevokeDelegationData = {
  target: Address;
  account: AnyAccount;
  signatory: AnyAccount | null;
  tracks: number[];
  locks: Record<string, BN>;
};

export type FeeData = {
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
