import { type BN } from '@polkadot/util';

import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type Asset } from './asset';
import { type ChainId } from './general';

export type Balance = AssetBalance & {
  id: string;
  chainId: ChainId;
  accountId: AccountId;
  assetId: Asset['assetId'];
};

export type AssetBalance = {
  verified?: boolean;
  free?: BN;
  reserved?: BN;
  frozen?: BN;
  locked?: AssetLock[];
};

export type AssetLock = {
  type: LockTypes;
  amount: BN;
};

export const enum LockTypes {
  STAKING = '0x7374616b696e6720',
  CONVICTION_VOTE = '0x7079636f6e766f74',
}
