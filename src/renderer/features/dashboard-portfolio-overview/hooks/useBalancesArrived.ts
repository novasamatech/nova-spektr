import { useStoreMap } from 'effector-react';

import { balanceModel } from '@/entities/balance';
import { hasBalanceRecords } from '../lib/balanceRecords';

/**
 * True once the balance store holds anything at all for the selected accounts —
 * see {@link hasBalanceRecords}. Until then the card cannot honestly say the
 * accounts hold nothing.
 */
export const useBalancesArrived = (accountIds: string[]): boolean => {
  return useStoreMap({
    store: balanceModel.$balanceMap,
    keys: [accountIds],
    fn: (balanceMap, [ids]) => hasBalanceRecords(balanceMap, ids),
  });
};
