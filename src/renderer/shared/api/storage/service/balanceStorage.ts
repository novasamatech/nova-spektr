import { Balance, BalanceKey } from '@shared/core/types/balance';
import { ChainId, AccountId } from '@shared/core';
import { BalanceDS, IBalanceStorage, TBalance } from '../lib/types';

export const useBalanceStorage = (db: TBalance): IBalanceStorage => ({
  getBalance: (accountId: AccountId, chainId: ChainId, assetId: string): Promise<BalanceDS | undefined> => {
    return db.get([accountId, chainId, assetId]);
  },

  getBalances: (accountIds: AccountId[]): Promise<BalanceDS[]> => {
    return db.where('accountId').anyOf(accountIds).toArray();
  },

  getAllBalances: (): Promise<BalanceDS[]> => {
    return db.toArray();
  },

  getNetworkBalances: (accountIds: AccountId[], chainId: ChainId): Promise<BalanceDS[]> => {
    return db
      .where(['accountId', 'chainId'])
      .anyOf(accountIds.map((accountId) => [accountId, chainId]))
      .toArray();
  },

  getAssetBalances: (accountIds: AccountId[], chainId: ChainId, assetId: string): Promise<BalanceDS[]> => {
    return db
      .where(['accountId', 'chainId', 'assetId'])
      .anyOf(accountIds.map((accountId) => [accountId, chainId, assetId]))
      .toArray();
  },

  addBalance: async (balance: Balance): Promise<void> => {
    try {
      await db.add(balance);
    } catch (e) {
      console.warn(
        `The same balance for account ${balance.accountId} chain ${balance.chainId} and asset ${balance.assetId} exists`,
      );
      await db.update([balance.accountId, balance.chainId, balance.assetId], balance);
    }
  },

  updateBalance: async (balance: Balance): Promise<void> => {
    await db.update([balance.accountId, balance.chainId, balance.assetId], balance);
  },

  insertBalances: (balances: Balance[]): Promise<string[]> => {
    return db.bulkPut(balances);
  },

  setBalanceIsValid: ({ accountId, chainId, assetId }: BalanceKey, verified: boolean): Promise<number> => {
    return db.update([accountId, chainId, assetId], { verified });
  },

  deleteBalances: (accountIds: AccountId[]): Promise<number> => {
    return db.where('accountId').anyOf(accountIds).delete();
  },
});
