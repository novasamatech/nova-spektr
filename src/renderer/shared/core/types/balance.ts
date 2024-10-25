import { type BN } from '@polkadot/util';

import { type AccountId, type ChainId, type ID } from './general';

export type Balance = AssetBalance & {
  id: ID;
  chainId: ChainId;
  accountId: AccountId;
  assetId: string;
};

// STAKING - 0x7374616b696e6720
// CONVICTION_VOTE - 0x7079636f6e766f74
export type LockType = '0x7374616b696e6720' | '0x7079636f6e766f74';

export type AssetBalance = {
  verified?: boolean;
  free?: BN;
  reserved?: BN;
  frozen?: BN;
  locked?: {
    type: LockType;
    amount: BN;
  }[];
};
