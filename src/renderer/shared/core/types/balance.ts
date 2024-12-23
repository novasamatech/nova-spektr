import { type BN } from '@polkadot/util';

import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type ChainId, type ID } from './general';

export type Balance = AssetBalance & {
  id: ID;
  chainId: ChainId;
  accountId: AccountId;
  assetId: string;
};

export type AssetBalance = {
  verified?: boolean;
  free?: BN;
  reserved?: BN;
  frozen?: BN;
  locked?: {
    type: LockTypes;
    amount: BN;
  }[];
};

export const enum LockTypes {
  STAKING = '0x7374616b696e6720',
  CONVICTION_VOTE = '0x7079636f6e766f74',
}
