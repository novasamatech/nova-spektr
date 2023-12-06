import { IBalanceService } from './common/types';
import { storage } from '@shared/api/storage';

export const useBalanceService = (): IBalanceService => {
  const balanceStorage = storage.connectTo('balances');

  if (!balanceStorage) {
    throw new Error('=== 🔴 Balances storage in not defined 🔴 ===');
  }

  const { getBalances, getAllBalances, getBalance, insertBalances } = balanceStorage;

  return {
    getAllBalances,
    getBalances,
    getBalance,
    insertBalances,
  };
};
