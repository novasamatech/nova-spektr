import { useStoreMap } from 'effector-react';

import { ConnectionStatus } from '@/shared/core';
import { networkModel } from '@/entities/network';

/**
 * True while any chain is still connecting — balances for it have not streamed
 * in yet, so the numbers on screen are being updated.
 */
export const useBalancesSyncing = (): boolean => {
  return useStoreMap(networkModel.$connectionStatuses, (statuses) =>
    Object.values(statuses).some((status) => status === ConnectionStatus.CONNECTING),
  );
};
