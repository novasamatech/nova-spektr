import { type ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';

import { type Chain, type ChainId, type Connection, type ConnectionStatus } from '@/shared/core';
import { networkModel } from '../model/network-model';

import { type ExtendedChain } from './types';

type NetworkData = {
  api: ApiPromise;
  chain: Chain;
  connectionStatus: ConnectionStatus;
  connection: Connection;
  extendedChain: ExtendedChain;
};

export const useNetworkData = (chainId = '0x00' as ChainId): NetworkData => {
  const apis = useUnit(networkModel.$apis);
  const chains = useUnit(networkModel.$chains);
  const connectionStatuses = useUnit(networkModel.$connectionStatuses);
  const connections = useUnit(networkModel.$connections);

  return {
    api: apis[chainId],
    chain: chains[chainId],
    connectionStatus: connectionStatuses[chainId],
    connection: connections[chainId],
    // TODO: Try to remove all extendedChain usage in future
    extendedChain: {
      ...chains[chainId],
      connection: connections[chainId],
      connectionStatus: connectionStatuses[chainId],
      api: apis[chainId],
    } as ExtendedChain,
  };
};
