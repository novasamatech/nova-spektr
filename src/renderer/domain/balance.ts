import { ChainID, AccountID } from './shared-kernel';

export type BalanceLock = {
  type: string;
  amount: string;
};

export type Balance = {
  chainId: ChainID;
  accountId: AccountID;
  assetId: string;
  verified?: boolean;
  free?: string;
  reserved?: string;
  frozen?: string;
  locked?: BalanceLock[];
};
