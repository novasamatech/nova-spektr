import { useRef, useState } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ScProvider } from '@polkadot/rpc-provider/substrate-connect';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import keyBy from 'lodash/keyBy';

import { Chain } from '@renderer/domain/chain';
import { Connection, RpcNode, ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
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

  const updateConnectionState = async (
    connection: Connection,
    api?: ApiPromise,
    disconnect?: () => void,
  ): Promise<void> => {
    await updateConnection(connection);

    setConnections((currentConnections) => {
      const chainData = currentConnections[connection.chainId] || chains.current[connection.chainId];

      return {
        ...currentConnections,
        [connection.chainId]: { ...chainData, connection, api, disconnect },
      };
    });
  };

  const updateConnectionStatus = async (connection: Connection, connectionStatus: ConnectionStatus): Promise<void> => {
    setConnections((currentConnections) => ({
      ...currentConnections,
      [connection.chainId]: {
        ...currentConnections[connection.chainId],
        connection: { ...currentConnections[connection.chainId].connection, connectionStatus },
      },
    }));
  };

  const removeConnection = (chainId: ChainId): void => {
    setConnections((currentConnections) => {
      const { [chainId]: connection, ...rest } = currentConnections;

      return rest;
    });
  };

  const disconnectFromNetwork = async (connection: Connection, api?: ApiPromise, provider?: ProviderInterface) => {
    const disabledConnection = {
      ...connection,
      activeNode: undefined,
      connectionType: ConnectionType.DISABLED,
      connectionStatus: ConnectionStatus.NONE,
    };
    removeConnection(connection.chainId);
    await updateConnectionState(disabledConnection);

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
          connectionStatus: ConnectionStatus.NONE,
          activeNode,
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

  const subscribeConnectionEvents = (connection: Connection, provider: ProviderInterface): void => {
    provider.on('connected', () => {
      updateConnectionStatus(connection, ConnectionStatus.CONNECTED);
    });
    provider.on('error', () => {
      updateConnectionStatus(connection, ConnectionStatus.ERROR);
    });
    provider.on('disconnected', () => {
      updateConnectionStatus(connection, ConnectionStatus.NONE);
    });
  };

  const connectToNetwork = async (chainId: ChainId, type: ConnectionType, node?: RpcNode): Promise<void> => {
    const connection = connections[chainId];
    if (!connection) return;

    await updateConnectionState({
      ...connection.connection,
      connectionType: type,
      connectionStatus: ConnectionStatus.CONNECTING,
    });

    let provider: ProviderInterface | undefined;

    if (type === ConnectionType.LIGHT_CLIENT) {
      const knownChainId = getKnownChain(chainId);

      if (knownChainId) {
        provider = new ScProvider(knownChainId);
        await provider.connect();
      } else {
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

          provider = new ScProvider(chainSpec, relayProvider);
        } else {
          provider = new ScProvider(chainSpec);
        }
      }
    }

    if (type === ConnectionType.RPC_NODE && node) {
      // TODO: handle limited retries provider = new WsProvider(node.url, 5000, {}, 11000);
      provider = new WsProvider(node.url);
    }

    const api = provider ? await ApiPromise.create({ provider }) : undefined;

    if (provider) {
      subscribeConnectionEvents(connection.connection, provider);
    }

    await updateConnectionState(
      {
        ...connection.connection,
        activeNode: node,
        connectionType: type,
        connectionStatus: api ? ConnectionStatus.CONNECTED : ConnectionStatus.ERROR,
      },
      api,
      async () => disconnectFromNetwork(connection.connection, api, provider),
    );
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
