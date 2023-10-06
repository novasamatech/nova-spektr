import type { ChainId, AccountId } from './general';

export type Balance = {
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
}

export type BalanceLock = {
  type: LockTypes;
  amount: string;
};

export type BalanceKey = Pick<Balance, 'accountId' | 'chainId' | 'assetId'>;
