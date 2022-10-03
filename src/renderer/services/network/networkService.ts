import { ApiPromise, WsProvider } from '@polkadot/api';
import { ScProvider } from '@polkadot/rpc-provider/substrate-connect';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import keyBy from 'lodash/keyBy';
import { useRef, useState } from 'react';

import { Chain } from '@renderer/domain/chain';
import { Connection, ConnectionStatus, ConnectionType, RpcNode } from '@renderer/domain/connection';
import { ChainId } from '@renderer/domain/shared-kernel';
import storage from '@renderer/services/storage';
import { useChainSpec } from './chainSpecService';
import { useChains } from './chainsService';
import { ConnectionsMap, INetworkService } from './common/types';

export const useNetwork = (): INetworkService => {
  const chains = useRef<Record<ChainId, Chain>>({});
  const [connections, setConnections] = useState<ConnectionsMap>({});

  const { getChainsData, sortChains } = useChains();
  const { getKnownChain, getChainSpec } = useChainSpec();

  const connectionStorage = storage.connectTo('connections');

  if (!connectionStorage) {
    throw new Error('=== 🔴 Connections storage in not defined 🔴 ===');
  }

  const { getConnections, addConnections, updateConnection } = connectionStorage;

  const updateConnectionState = (
    chainId: ChainId,
    updates: Partial<Connection>,
    disconnect?: (switchNetwork: boolean) => Promise<void>,
    api?: ApiPromise,
  ) => {
    setConnections((currentConnections) => {
      const currentConnection = currentConnections[chainId];
      const { api: currentApi, disconnect: currentDisconnect, ...rest } = currentConnection || chains.current[chainId];

      // TODO: not a good solution, but here we got the most fresh connection
      updateConnection({ ...currentConnection.connection, ...updates });

      return {
        ...currentConnections,
        [chainId]: {
          ...rest,
          connection: { ...currentConnection.connection, ...updates },
          api: api || currentApi,
          disconnect: disconnect || currentDisconnect,
        },
      };
    });
  };

  const disconnectFromNetwork =
    (chainId: ChainId, provider?: ProviderInterface, api?: ApiPromise) =>
    async (switchNetwork: boolean): Promise<void> => {
      try {
        await api?.disconnect();
      } catch (e) {
        console.warn(e);
      }

      try {
        await provider?.disconnect();
      } catch (e) {
        console.warn(e);
      }

      if (switchNetwork) return;

      const connection = connections[chainId];
      if (!connection) return;

      updateConnectionState(chainId, {
        activeNode: undefined,
        connectionType: ConnectionType.DISABLED,
        connectionStatus: ConnectionStatus.NONE,
      });
    };

  const getNewConnections = async (): Promise<Connection[]> => {
    const currentConnections = await getConnections();
    const connectionData = keyBy(currentConnections, 'chainId');

    return Object.values(chains.current).reduce((acc, { chainId, nodes }) => {
      if (!connectionData[chainId]) {
        const connectionType = getKnownChain(chainId) ? ConnectionType.LIGHT_CLIENT : ConnectionType.RPC_NODE;
        const activeNode = connectionType === ConnectionType.RPC_NODE ? nodes[0] : undefined;

        acc.push({
          chainId,
          connectionType,
          activeNode,
          connectionStatus: ConnectionStatus.NONE,
        });
      }

      return acc;
    }, [] as Connection[]);
  };

  const getExtendConnections = async (): Promise<ConnectionsMap> => {
    const currentConnections = await getConnections();
    const connectionData = keyBy(currentConnections, 'chainId');

    return Object.values(chains.current).reduce((acc, chain) => {
      acc[chain.chainId] = {
        ...chains.current[chain.chainId],
        connection: connectionData[chain.chainId],
      };

      return acc;
    }, {} as ConnectionsMap);
  };

  const createSubstrateProvider = async (chainId: ChainId): Promise<ProviderInterface> => {
    const knownChainId = getKnownChain(chainId);

    if (knownChainId) {
      return new ScProvider(knownChainId);
    }

    const chainSpec = await getChainSpec(chainId);
    if (!chainSpec) {
      throw new Error('Chain spec not found');
    }

    const parentId = chains.current[chainId].parentId;
    if (parentId) {
      const parentName = getKnownChain(parentId);
      if (!parentName) {
        throw new Error('Relay chain not found');
      }
      const relayProvider = new ScProvider(parentName);

      return new ScProvider(chainSpec, relayProvider);
    }

    return new ScProvider(chainSpec);
  };

  const createWebsocketProvider = (rpcUrl: string): ProviderInterface => {
    // TODO: handle limited retries provider = new WsProvider(node.url, 5000, {1}, 11000);
    return new WsProvider(rpcUrl, 2000);
  };

  const subscribeConnected = (chainId: ChainId, provider: ProviderInterface, type: ConnectionType, node?: RpcNode) => {
    const handler = async () => {
      console.log('🟢 connected ==> ', chainId);

      const api = await ApiPromise.create({ provider });
      if (!api) await provider.disconnect();

      updateConnectionState(
        chainId,
        {
          activeNode: node,
          connectionType: type,
          connectionStatus: api ? ConnectionStatus.CONNECTED : ConnectionStatus.ERROR,
        },
        disconnectFromNetwork(chainId, provider, api),
        api,
      );
    };

    provider.on('connected', handler);
  };

  const subscribeDisconnected = (chainId: ChainId, provider: ProviderInterface) => {
    const handler = async () => {
      console.log('🔶 disconnected ==> ', chainId);
    };

    provider.on('disconnected', handler);
  };

  const subscribeError = (chainId: ChainId, provider: ProviderInterface) => {
    const handler = () => {
      console.log('🔴 error ==> ', chainId);

      updateConnectionState(chainId, {
        connectionStatus: ConnectionStatus.ERROR,
      });
    };

    provider.on('error', handler);
  };

  const connectToNetwork = async (
    chainId: ChainId,
    type: ConnectionType.RPC_NODE | ConnectionType.LIGHT_CLIENT,
    node?: RpcNode,
  ): Promise<void> => {
    const connection = connections[chainId];
    if (!connection) return;

    updateConnectionState(chainId, {
      activeNode: node,
      connectionType: type,
      connectionStatus: ConnectionStatus.CONNECTING,
    });

    const provider: { instance?: ProviderInterface; isScProvider: boolean } = {
      instance: undefined,
      isScProvider: type === ConnectionType.LIGHT_CLIENT,
    };

    if (type === ConnectionType.LIGHT_CLIENT) {
      provider.instance = await createSubstrateProvider(chainId);
    } else if (type === ConnectionType.RPC_NODE && node) {
      provider.instance = createWebsocketProvider(node.url);
    }

    setConnections((currentConnections) => ({
      ...currentConnections,
      [connection.chainId]: {
        ...currentConnections[chainId],
        disconnect: disconnectFromNetwork(chainId, provider.instance),
      },
    }));

    if (provider.instance) {
      subscribeConnected(chainId, provider.instance, type, node);
      subscribeDisconnected(chainId, provider.instance);
      subscribeError(chainId, provider.instance);

      if (provider.isScProvider) {
        await provider.instance.connect();
      }
    } else {
      updateConnectionState(chainId, {
        activeNode: node,
        connectionType: type,
        connectionStatus: ConnectionStatus.ERROR,
      });
    }
  };

  const setupConnections = async (): Promise<void> => {
    try {
      const chainsData = await getChainsData();
      chains.current = keyBy(sortChains(chainsData), 'chainId');

      const newConnections = await getNewConnections();
      await addConnections(newConnections);

      const connectionsMap = await getExtendConnections();
      setConnections(connectionsMap);
    } catch (error) {
      console.error(error);
    }
  };

  return {
    connections,
    setupConnections,
    connectToNetwork,
  };
};
