import { ChainId, AccountId } from '@renderer/domain/shared-kernel';
import { BalanceDS } from '@renderer/services/storage/common/types';
import { ExtendedChain } from '@renderer/services/network/common/types';

export type FormattedBalance = {
  value: string;
  suffix: string;
  decimalPlaces: number;
};

export interface IBalanceService {
  getBalance: (accountId: AccountId, chainId: ChainId, assetId: string) => Promise<BalanceDS | undefined>;
  getLiveBalance: (accountId: AccountId, chainId: ChainId, assetId: string) => BalanceDS | undefined;
  getLiveNetworkBalances: (accountIds: AccountId[], chainId: ChainId) => BalanceDS[];
  getNetworkBalances: (accountIds: AccountId[], chainId: ChainId) => Promise<BalanceDS[]>;
  getAssetBalances: (accountIds: AccountId[], chainId: ChainId, assetId: string) => Promise<BalanceDS[]>;
  getLiveAssetBalances: (accountIds: AccountId[], chainId: ChainId, assetId: string) => BalanceDS[];
  getBalances: (accountIds: AccountId[]) => Promise<BalanceDS[]>;
  getAllBalances: () => Promise<BalanceDS[]>;
  getLiveBalances: (accountIds: AccountId[]) => BalanceDS[];
  subscribeBalances: (
    chain: ExtendedChain,
    parachain: ExtendedChain | undefined,
    accountIds: AccountId[],
  ) => Promise<any>;
  subscribeLockBalances: (chain: ExtendedChain, accountIds: AccountId[]) => Promise<any>;
}
