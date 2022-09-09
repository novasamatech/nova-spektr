import { useRef, useState } from 'react';
import keyBy from 'lodash/keyBy';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ScProvider } from '@polkadot/rpc-provider/substrate-connect';
import { ProviderInterface } from '@polkadot/rpc-provider/types';

import { Chain } from '@renderer/domain/chain';
import { Connection, ConnectionType } from '@renderer/domain/connection';
import { ChainId } from '@renderer/domain/shared-kernel';
import storage from '@renderer/services/storage';
import { useChainSpec } from './chainSpecService';
import { useChains } from './chainsService';
import { ExtendedChain, INetworkService } from './common/types';

export const useNetwork = (): INetworkService => {
  const chains = useRef<Record<string, Chain>>({});
  const [connections, setConnections] = useState<Record<string, ExtendedChain>>({});

  const { getChainsData } = useChains();
  const { getKnownChain, getChainSpec } = useChainSpec();

  const connectionStorage = storage.connectTo('connections');

  if (!connectionStorage) {
    throw new Error('=== 🔴 Connections storage in not defined 🔴 ===');
  }

  const { getConnections, addConnections, changeConnectionType } = connectionStorage;

  const updateConnectionType = async (chainId: ChainId, type: ConnectionType): Promise<void> => {
    const connection = connections[chainId];
    if (connection) {
      await changeConnectionType(connection.connection, type);
      connection.connection.type = type;
    }
  };

  const initConnnections = async (): Promise<void> => {
    const chainsData = await getChainsData();
    chains.current = keyBy(chainsData, 'chainId');
    const currentConnections = await getConnections();
    const connectionData = keyBy(currentConnections, 'chainId');

    const connections = Object.values(chains.current).reduce((acc, { chainId }) => {
      if (!connectionData[chainId]) {
        const type = getKnownChain(chainId) ? ConnectionType.LIGHT_CLIENT : ConnectionType.RPC_NODE;
        acc.push({ chainId, type });
      }

      return acc;
    }, [] as Connection[]);

    const extendedConnections = connections.reduce((acc, connection) => {
      acc[connection.chainId] = {
        ...chains.current[connection.chainId],
        connection,
      };

      return acc;
    }, {} as Record<string, ExtendedChain>);

    setConnections(extendedConnections);

    await addConnections(connections);
  };

  const connect = async (): Promise<void> => {
    const currentConnections = await getConnections();

    currentConnections.forEach(async (connection) => {
      let provider: ProviderInterface | undefined;

      setConnections((currentConnections) => ({
        ...currentConnections,
        [connection.chainId]: {
          ...chains.current[connection.chainId],
          connection,
        },
      }));

      if (connection.type === ConnectionType.LIGHT_CLIENT) {
        const chainId = getKnownChain(connection.chainId);

        if (chainId) {
          provider = new ScProvider(chainId);
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
      } else if (connection.type === ConnectionType.RPC_NODE) {
        // TODO: Add possibility to select best node
        provider = new WsProvider(chains.current[connection.chainId].nodes[0].url);
      }

      if (!provider) return;
      const api = await ApiPromise.create({ provider });

      setConnections((currentConnections) => ({
        ...currentConnections,
        [connection.chainId]: {
          ...chains.current[connection.chainId],
          connection,
          api,
        },
      }));
    });
  };

  const init = async (): Promise<void> => {
    await initConnnections();
    try {
      await connect();
    } catch (e) {
      console.error(e);
    }
  };

  const reconnect = async (chainId: ChainId): Promise<void> => {
    const connection = connections[chainId];

    if (!connection) return;

    const { api } = connection;
    if (!api) return;
    try {
      await api.disconnect();
    } catch (e) {
      // TODO: Add error handling
      console.error(e);
    }

    await api.connect();
  };

  return {
    connections,
    init,
    reconnect,
    updateConnectionType,
  };
};
