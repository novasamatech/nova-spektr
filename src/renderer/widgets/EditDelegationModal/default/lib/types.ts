import { type BN } from '@polkadot/util';

import { type Address, type Chain, type Conviction, type Wallet } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

export type WalletData = {
  wallet: Wallet;
  chain: Chain;
};

export type DelegateData = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  tracks: number[];
  target: Address;
  conviction: Conviction;
  balance: string;
  locks: Record<string, BN>;
};
