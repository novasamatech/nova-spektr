import { IndexableType, Table } from 'dexie';

import { Balance } from '@renderer/domain/balance';
import { ChainId, PublicKey } from '@renderer/domain/shared-kernel';
import { BalanceDS, IBalanceStorage } from './common/types';

export const useBalanceStorage = (db: Table<BalanceDS>): IBalanceStorage => ({
  getBalance: (publicKey: PublicKey, chainId: ChainId, assetId: string): Promise<BalanceDS | undefined> => {
    return db.where({ publicKey, chainId, assetId }).first();
  },

  getBalances: (publicKey: PublicKey): Promise<BalanceDS[]> => {
    return db.where({ publicKey }).toArray();
  },

  getNetworkBalances: (publicKey: PublicKey, chainId: ChainId): Promise<BalanceDS[]> => {
    return db.where({ publicKey, chainId }).toArray();
  },

  updateBalance: async (balance: Balance): Promise<IndexableType> => {
    const currentBalance = await db.get({
      publicKey: balance.publicKey,
      chainId: balance.chainId,
      assetId: balance.assetId,
    });

    if (!currentBalance) {
      return db.put(balance);
    }

    return db.update([balance.publicKey, balance.chainId, balance.assetId], balance);
  },
});
