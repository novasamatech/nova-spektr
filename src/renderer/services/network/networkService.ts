import { ApiPromise, WsProvider } from '@polkadot/api';
import { ScProvider } from '@polkadot/rpc-provider/substrate-connect';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import keyBy from 'lodash/keyBy';
import { useRef, useState } from 'react';

import { Chain } from '@renderer/domain/chain';
import { Connection, ConnectionNode, ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ConnectionsMap, ExtendedChain, INetworkService } from './common/types';
import { ChainId } from '@renderer/domain/shared-kernel';
import storage from '@renderer/services/storage';
import { useChainSpec } from './chainSpecService';
import { useChains } from './chainsService';

export const useNetwork = (): INetworkService => {
  const chains = useRef<Record<string, Chain>>({});
  const [connections, setConnections] = useState<ConnectionsMap>({});

  const { getChainsData, sortChains } = useChains();
  const { getKnownChain, getChainSpec } = useChainSpec();

  const connectionStorage = storage.connectTo('connections');

  if (!connectionStorage) {
    throw new Error('=== 🔴 Connections storage in not defined 🔴 ===');
  }

  const { getConnections, addConnections, updateConnection } = connectionStorage;

  const updateEntireConnection = async (connection: Connection): Promise<void> => {
    await updateConnection(connection);
    setConnections((currentConnections) => ({
      ...currentConnections,
      [connection.chainId]: { ...currentConnections[connection.chainId], connection },
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

  const getExtendConnections = async (): Promise<ConnectionsMap> => {
    const chainsData = await getChainsData();
    const currentConnections = await getConnections();

    chains.current = keyBy(sortChains(chainsData), 'chainId');
    const connectionData = keyBy(currentConnections, 'chainId');

    return Object.values(chains.current).reduce((acc, chain) => {
      acc[chain.chainId] = {
        ...chains.current[chain.chainId],
        connection: connectionData[chain.chainId],
      };

      return acc;
    }, {} as Record<ChainId, ExtendedChain>);
  };

  const connectToNetwork = async (chainId: ChainId, type: ConnectionType, node?: ConnectionNode): Promise<void> => {
    const connection = connections[chainId];
    if (!connection) return;

    await updateEntireConnection({
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
    } else {
      throw new Error('RPC node not provided');
    }

    const api = provider ? await ApiPromise.create({ provider }) : undefined;

    const updatedConnection = {
      ...connection.connection,
      activeNode: node,
      connectionType: type,
      connectionStatus: api ? ConnectionStatus.CONNECTED : ConnectionStatus.ERROR,
    };

    await updateConnection(updatedConnection);
    setConnections((currentConnections) => ({
      ...currentConnections,
      [chainId]: { ...connection, api, connection: updatedConnection },
    }));
  };

  const setupConnections = async (): Promise<void> => {
    try {
      const newConnections = await getNewConnections();
      await addConnections(newConnections);
      const connectionsMap = await getExtendConnections();
      setConnections(connectionsMap);
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
    setupConnections: setupConnections,
    reconnect,
    connectToNetwork,
  };
};
