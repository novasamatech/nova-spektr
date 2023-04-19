import { Balance } from '@renderer/domain/balance';
import { ChainID, AccountID } from '@renderer/domain/shared-kernel';
import { BalanceDS, IBalanceStorage, TBalance } from './common/types';

export const useBalanceStorage = (db: TBalance): IBalanceStorage => ({
  getBalance: (accountId: AccountID, chainId: ChainID, assetId: string): Promise<BalanceDS | undefined> => {
    return db.where({ accountId, chainId, assetId }).first();
  },

  getBalances: (accountIds: AccountID[]): Promise<BalanceDS[]> => {
    return db.where('accountId').anyOf(accountIds).toArray();
  },

  getAllBalances: (): Promise<BalanceDS[]> => {
    return db.toArray();
  },

  getNetworkBalances: (accountIds: AccountID[], chainId: ChainID): Promise<BalanceDS[]> => {
    return db
      .where(['accountId', 'chainId'])
      .anyOf(accountIds.map((accountId) => [accountId, chainId]))
      .toArray();
  },

  getAssetBalances: (accountIds: AccountID[], chainId: ChainID, assetId: string): Promise<BalanceDS[]> => {
    return db
      .where(['accountId', 'chainId', 'assetId'])
      .anyOf(accountIds.map((accountId) => [accountId, chainId, assetId]))
      .toArray();
  },

  updateBalance: async (balance: Balance): Promise<void> => {
    try {
      await db.add(balance);
    } catch (e) {
      await db.update([balance.accountId, balance.chainId, balance.assetId], balance);
    }
  },

  setBalanceIsValid: ({ accountId, chainId, assetId }: Balance, verified: boolean): Promise<number> => {
    return db.update([accountId, chainId, assetId], { verified });
  },
});
