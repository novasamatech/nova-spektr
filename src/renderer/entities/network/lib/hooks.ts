import { type ApiPromise } from '@polkadot/api';
import { useStoreMap } from 'effector-react';

import { type Chain, type ChainId, type Connection, type ConnectionStatus } from '@/shared/core';
import { networkModel } from '../model/network-model';

const DEFAULT_CHAIN_ID: ChainId = '0x00';

type NetworkData = {
  api: ApiPromise | null;
  chain: Chain | null;
  connectionStatus: ConnectionStatus | null;
  connection: Connection | null;
};

export const useApi = (chainId: ChainId): ApiPromise | null => {
  return useStoreMap({
    store: networkModel.$apis,
    keys: [chainId],
    fn: (apis, [id]) => apis[id] ?? null,
  });
};

export const useChain = (chainId: ChainId): Chain | null => {
  return useStoreMap({
    store: networkModel.$chains,
    keys: [chainId],
    fn: (chains, [id]) => chains[id] ?? null,
  });
};

export const useConnectionStatus = (chainId: ChainId): ConnectionStatus | null => {
  return useStoreMap({
    store: networkModel.$connectionStatuses,
    keys: [chainId],
    fn: (statuses, [id]) => statuses[id] ?? null,
  });
};

export const useConnection = (chainId: ChainId): Connection | null => {
  return useStoreMap({
    store: networkModel.$connections,
    keys: [chainId],
    fn: (connections, [id]) => connections[id] ?? null,
  });
};

export const useNetworkData = (chainId: ChainId = DEFAULT_CHAIN_ID): NetworkData => ({
  api: useApi(chainId),
  chain: useChain(chainId),
  connectionStatus: useConnectionStatus(chainId),
  connection: useConnection(chainId),
});
