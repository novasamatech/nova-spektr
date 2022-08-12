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

  updateBalance: (balance: Balance): Promise<IndexableType> => {
    return db.put(balance);
  },
});
