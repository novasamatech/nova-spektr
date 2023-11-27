import { useUnit } from 'effector-react';

import { ChainId } from '@shared/core';
import { networkModel } from '../../model/network-model';
import { connectionModel } from '../../model/connection-model';

export const useNetworkData = (chainId: ChainId) => {
  const apis = useUnit(networkModel.$apis);
  const chains = useUnit(networkModel.$chains);
  const networkStatuses = useUnit(networkModel.$networkStatuses);
  const connections = useUnit(connectionModel.$connections);

  return {
    api: apis[chainId],
    chain: chains[chainId],
    status: networkStatuses[chainId],
    connection: connections[chainId],
  };
};
