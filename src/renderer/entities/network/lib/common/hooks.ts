import { useUnit } from 'effector-react';
import { ApiPromise } from '@polkadot/api';

import { Chain, ChainId, Connection, ConnectionStatus } from '@shared/core';
import { networkModel } from '../../model/network-model';
import { ExtendedChain } from './types';

type NetworkData = {
  api: ApiPromise;
  chain: Chain;
  connectionStatus: ConnectionStatus;
  connection: Connection;
  extendedChain: ExtendedChain;
};

export const useNetworkData = (chainId: ChainId): NetworkData => {
  const apis = useUnit(networkModel.$apis);
  const chains = useUnit(networkModel.$chains);
  const connectionStatuses = useUnit(networkModel.$connectionStatuses);
  const connections = useUnit(networkModel.$connections);

  return {
    api: apis[chainId],
    chain: chains[chainId],
    connectionStatus: connectionStatuses[chainId],
    connection: connections[chainId],
    extendedChain: {
      ...chains[chainId],
      connection: connections[chainId],
      connectionStatus: connectionStatuses[chainId],
      api: apis[chainId],
    } as ExtendedChain,
  };
};
