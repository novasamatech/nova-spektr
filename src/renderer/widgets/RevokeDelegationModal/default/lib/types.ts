import { type BN } from '@polkadot/util';

import { type Address } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

export type RevokeDelegationData = {
  target: Address;
  account: AnyAccount;
  signatory: AnyAccount | null;
  tracks: number[];
  locks: Record<string, BN>;
};
