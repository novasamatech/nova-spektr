import { IndexableType, PromiseExtended } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from './storage';
import { IBalanceStorage, Balance } from './types';
import { HexString } from '@renderer/domain/types';

export const useBalanceStorage = (): IBalanceStorage => ({
  getBalance: (publicKey: HexString, chainId: HexString, assetId: string): Balance | undefined => {
    return useLiveQuery(() => db.balances.where({ publicKey, chainId, assetId }).first());
  },

  getBalances: (publicKey: HexString): PromiseExtended<Balance[]> => {
    return db.balances.where({ publicKey }).toArray();
  },

  updateBalance: (balance: Balance): PromiseExtended<IndexableType> => {
    return db.balances.put(balance);
  },
});
