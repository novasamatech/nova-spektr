import { type AccountId, type ChainId, type ID } from './general';

export type Balance = {
  id: ID;
  chainId: ChainId;
  accountId: AccountId;
  assetId: string;
  verified?: boolean;
  free?: string;
  reserved?: string;
  frozen?: string;
  locked?: BalanceLock[];
};

export const enum LockTypes {
  STAKING = '0x7374616b696e6720',
  CONVICTION_VOTE = '0x7079636f6e766f74',
}

export type BalanceLock = {
  type: LockTypes;
  amount: string;
};

export type AssetBalance = Pick<Balance, 'verified' | 'free' | 'reserved' | 'frozen' | 'locked'>;
