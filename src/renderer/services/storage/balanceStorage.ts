import { IndexableType } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from './storage';
import { IBalanceStorage, Balance } from './common/types';
import { HexString } from '@renderer/domain/types';

export const useBalanceStorage = (): IBalanceStorage => ({
  getBalance: (publicKey: HexString, chainId: HexString, assetId: string): Balance | undefined => {
    return useLiveQuery(() => db.balances.where({ publicKey, chainId, assetId }).first());
  },

  getBalances: (publicKey: HexString): Promise<Balance[]> => {
    return db.balances.where({ publicKey }).toArray();
  },

  updateBalance: (balance: Balance): Promise<IndexableType> => {
    return db.balances.put(balance);
  },
});
