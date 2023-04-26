import { ChainId, AccountId } from './shared-kernel';

export type BalanceLock = {
  type: string;
  amount: string;
};

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
