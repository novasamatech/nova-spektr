import { type BN } from '@polkadot/util';

import { type Address, type Asset, type Chain, type Conviction } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

export type RevokeDelegationInput = {
  id?: number;
  chain: Chain;
  asset: Asset;
  account: AnyAccount;
  transferable: string;
  locks: BN;

  tracks: number[];
  target: Address;
  conviction: Conviction;
  balance: string;

  description: string;

  signatory: AnyAccount | null;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
};
