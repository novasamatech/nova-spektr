import { type BN } from '@polkadot/util';

export type RevokeDelegationData = {
  tracks: number[];
  locks: Record<string, BN>;
};
