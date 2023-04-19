import { ChainID, AccountID } from '@renderer/domain/shared-kernel';
import { BalanceDS } from '@renderer/services/storage/common/types';
import { ExtendedChain } from '@renderer/services/network/common/types';

export type FormattedBalance = {
  value: string;
  suffix: string;
  decimalPlaces: number;
};

export interface IBalanceService {
  getBalance: (accountId: AccountID, chainId: ChainID, assetId: string) => Promise<BalanceDS | undefined>;
  getLiveBalance: (accountId: AccountID, chainId: ChainID, assetId: string) => BalanceDS | undefined;
  getLiveNetworkBalances: (accountIds: AccountID[], chainId: ChainID) => BalanceDS[];
  getNetworkBalances: (accountIds: AccountID[], chainId: ChainID) => Promise<BalanceDS[]>;
  getAssetBalances: (accountIds: AccountID[], chainId: ChainID, assetId: string) => Promise<BalanceDS[]>;
  getLiveAssetBalances: (accountIds: AccountID[], chainId: ChainID, assetId: string) => BalanceDS[];
  getBalances: (accountIds: AccountID[]) => Promise<BalanceDS[]>;
  getAllBalances: () => Promise<BalanceDS[]>;
  getLiveBalances: (accountIds: AccountID[]) => BalanceDS[];
  subscribeBalances: (
    chain: ExtendedChain,
    parachain: ExtendedChain | undefined,
    accountIds: AccountID[],
  ) => Promise<any>;
  subscribeLockBalances: (chain: ExtendedChain, accountIds: AccountID[]) => Promise<any>;
}
