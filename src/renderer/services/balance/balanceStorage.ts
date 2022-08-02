import { IndexableType, PromiseExtended } from 'dexie';

import db, { Balance } from '@renderer/services/storage';
import { HexString } from '@renderer/domain/types';
import { IBalanceStorage } from './common/types';

export const useBalanceStorage = (): IBalanceStorage => ({
  getBalance: (publicKey: HexString, chainId: HexString, assetId: string): PromiseExtended<Balance | undefined> => {
    return db.balances.where({ publicKey, chainId, assetId }).first();
  },

  getBalances: (publicKey: HexString): PromiseExtended<Balance[]> => {
    return db.balances.where({ publicKey: publicKey }).toArray();
  },

  updateBalance: (balance: Balance): PromiseExtended<IndexableType> => {
    return db.balances.put(balance);
  },
});
