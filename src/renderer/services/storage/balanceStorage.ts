import { Table } from 'dexie';

import { Balance } from '@renderer/domain/balance';
import { ChainId, PublicKey } from '@renderer/domain/shared-kernel';
import { BalanceDS, IBalanceStorage } from './common/types';

export const useBalanceStorage = (db: Table<BalanceDS>): IBalanceStorage => ({
  getBalance: (publicKey: PublicKey, chainId: ChainId, assetId: string): Promise<BalanceDS | undefined> => {
    return db.where({ publicKey, chainId, assetId }).first();
  },

  getBalances: (publicKeys: PublicKey[]): Promise<BalanceDS[]> => {
    return db.where('publicKey').anyOf(publicKeys).toArray();
  },

  getAllBalances: (): Promise<BalanceDS[]> => {
    return db.toArray();
  },

  getNetworkBalances: (publicKeys: PublicKey[], chainId: ChainId): Promise<BalanceDS[]> => {
    return db
      .where(['publicKey', 'chainId'])
      .anyOf(publicKeys.map((publicKey) => [publicKey, chainId]))
      .toArray();
  },

  updateBalance: async (balance: Balance): Promise<void> => {
    try {
      await db.add(balance);
    } catch (e) {
      await db.update([balance.publicKey, balance.chainId, balance.assetId], balance);
    }
  },

  setBalanceIsValid: ({ publicKey, chainId, assetId }: Balance, verified: boolean): Promise<number> => {
    return db.update([publicKey, chainId, assetId], {
      verified,
    });
  },
});
