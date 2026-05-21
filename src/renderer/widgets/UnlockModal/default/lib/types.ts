import { type BN } from '@polkadot/util';

import { type Asset, type Chain } from '@/shared/core';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount } from '@/domains/network';

export type UnlockFormData = {
  id?: number;
  amount: string;
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  chain: Chain;
  asset: Asset;
  totalLock: BN;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
  signingPath?: PathNode[];
};
