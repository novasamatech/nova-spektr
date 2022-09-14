import { ApiPromise, WsProvider } from '@polkadot/api';
import { ScProvider } from '@polkadot/rpc-provider/substrate-connect';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import keyBy from 'lodash/keyBy';
import { useRef, useState } from 'react';

import { Chain } from '@renderer/domain/chain';
import { Connection, ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ChainId } from '@renderer/domain/shared-kernel';
import storage from '@renderer/services/storage';
import { useChainSpec } from './chainSpecService';
import { useChains } from './chainsService';
import { ExtendedChain, INetworkService } from './common/types';

export const useNetwork = (): INetworkService => {
  const chains = useRef<Record<string, Chain>>({});
  const [connections, setConnections] = useState<Record<ChainId, ExtendedChain>>({});

  const { getChainsData, sortChains } = useChains();
  const { getKnownChain, getChainSpec } = useChainSpec();

  const connectionStorage = storage.connectTo('connections');

  if (!connectionStorage) {
    throw new Error('=== 🔴 Connections storage in not defined 🔴 ===');
  }

  const { getConnections, addConnections, changeConnectionType, changeConnectionStatus } = connectionStorage;

  const updateConnectionType = async (chainId: ChainId, type: ConnectionType): Promise<void> => {
    const match = connections[chainId];
    if (!match) return;

    const { connection, api, ...rest } = match;

    await changeConnectionType(connection, type);
    setConnections((currentConnections) => ({
      ...currentConnections,
      [chainId]: {
        api,
        connection: { ...connection, connectionType: type },
        ...rest,
      },
    }));
  };

  const updateConnectionStatus = async (chainId: ChainId, status: ConnectionStatus): Promise<void> => {
    const match = connections[chainId];
    if (!match) return;

    const { connection, api, ...rest } = match;

    await changeConnectionStatus(connection, status);
    setConnections((currentConnections) => ({
      ...currentConnections,
      [chainId]: {
        api,
        connection: { ...connection, connectionStatus: status },
        ...rest,
      },
    }));
  };

  const getNewConnections = async (): Promise<Connection[]> => {
    const chainsData = await getChainsData();
    const currentConnections = await getConnections();

    chains.current = keyBy(sortChains(chainsData), 'chainId');
    const connectionData = keyBy(currentConnections, 'chainId');

    return Object.values(chains.current).reduce((acc, { chainId }) => {
      if (!connectionData[chainId]) {
        acc.push({
          chainId,
          connectionType: ConnectionType.DISABLED,
          connectionStatus: ConnectionStatus.NONE,
          customNodes: [],
          activeNode: undefined,
        });
      }

      return acc;
    }, [] as Connection[]);
  };

  const extendConnections = async () => {
    const chainsData = await getChainsData();
    const currentConnections = await getConnections();

    chains.current = keyBy(sortChains(chainsData), 'chainId');
    const connectionData = keyBy(currentConnections, 'chainId');

    const extendedConnections = Object.values(chains.current).reduce((acc, chain) => {
      acc[chain.chainId] = {
        ...chains.current[chain.chainId],
        connection: connectionData[chain.chainId],
      };

      return acc;
    }, {} as Record<ChainId, ExtendedChain>);

    setConnections(extendedConnections);
  };

  const connectToNetwork = async (chainId: ChainId, type: ConnectionType, nodeUrl = ''): Promise<void> => {
    const connection = connections[chainId];
    if (!connection) return;

    await updateConnectionType(chainId, type);
    await updateConnectionStatus(chainId, ConnectionStatus.CONNECTING);

    let provider: ProviderInterface | undefined;
    if (type === ConnectionType.LIGHT_CLIENT) {
      const knownChainId = getKnownChain(connection.chainId);

      if (knownChainId) {
        provider = new ScProvider(knownChainId);
        await provider.connect();
      } else {
        const chainSpec = await getChainSpec(connection.chainId);

        if (!chainSpec) {
          throw new Error('Chain spec not found');
        }

        const parentId = chains.current[connection.chainId].parentId;
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

    if (type === ConnectionType.RPC_NODE && nodeUrl) {
      provider = new WsProvider(nodeUrl);

      // TODO: also set active Rpc_node
    }

    const api = provider ? await ApiPromise.create({ provider }) : undefined;
    const status = api ? ConnectionStatus.CONNECTED : ConnectionStatus.ERROR;

    await updateConnectionStatus(chainId, status);

    setConnections((currentConnections) => ({
      ...currentConnections,
      [chainId]: { ...connection, api },
    }));
  };

  const connectToNetworks = () => {
    Object.values(connections).forEach(({ connection }) => {
      const { chainId, connectionType, activeNode } = connection;

      if (connectionType === ConnectionType.DISABLED) return;

      connectToNetwork(chainId, connectionType, activeNode?.url);
    });
  };

  const init = async (): Promise<void> => {
    try {
      const newConnections = await getNewConnections();
      await addConnections(newConnections);
      await extendConnections();
      connectToNetworks();
    } catch (error) {
      console.error(error);
    }
  };

  const reconnect = async (chainId: ChainId): Promise<void> => {
    const connection = connections[chainId];

    if (!connection) return;

    const { api } = connection;
    if (!api) return;

    try {
      await api.disconnect();
    } catch (error) {
      // TODO: Add error handling
      console.error(error);
    }

    await api.connect();
  };

  return {
    connections,
    init,
    reconnect,
    connectToNetwork,
    updateConnectionType,
    updateConnectionStatus,
  };
};
