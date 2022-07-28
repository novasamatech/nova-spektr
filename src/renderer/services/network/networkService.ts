import { useRef } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { ScProvider } from '@polkadot/rpc-provider/substrate-connect';

import { useChains } from './chainsService';
import { Chain, ConnectionType, ExtendedChain, INetworkService } from './common/types';
import { useConnectionStorage, Connection } from './connectionStorage';
import { arrayToObject } from '@renderer/utils/objects';
import { useChainSpec } from './chainSpecService';
import { HexString } from '@renderer/domain/types';

export const useNetwork = (): INetworkService => {
  const chains = useRef<Record<string, Chain>>({});
  const connections = useRef<Record<string, ExtendedChain>>({});

  const { getChainsData } = useChains();
  const { getKnownChain, getChainSpec } = useChainSpec();
  const { getConnections, addConnections, changeConnectionType } = useConnectionStorage();

  const updateConnectionType = async (chainId: HexString, type: ConnectionType): Promise<void> => {
    const connection = connections.current[chainId];
    if (connection) {
      await changeConnectionType(connection.connection, type);
      connection.connection.type = type;
    }
  };

  const initConnnections = async (): Promise<void> => {
    const chainsData = await getChainsData();
    chains.current = arrayToObject(chainsData, 'chainId');
    const currentConnections = await getConnections();
    const connectionData = arrayToObject(currentConnections, 'chainId');

    const connections = Object.values(chains.current).reduce((acc, { chainId }) => {
      if (!connectionData[chainId]) {
        const type = getKnownChain(chainId) ? ConnectionType.LIGHT_CLIENT : ConnectionType.RPC_NODE;
        acc.push({ chainId, type });
      }

      return acc;
    }, [] as Connection[]);

    await addConnections(connections);
  };

  const connect = async (): Promise<void> => {
    const currentConnections = await getConnections();

    currentConnections.forEach(async (chain) => {
      let provider: ProviderInterface | undefined;

      if (chain.type === ConnectionType.LIGHT_CLIENT) {
        const chainId = getKnownChain(chain.chainId);

        if (chainId) {
          provider = new ScProvider(chainId);
          await provider.connect();
        } else {
          const chainSpec = await getChainSpec(chain.chainId);

          if (!chainSpec) {
            throw new Error('Chain spec not found');
          }

          const parentName = getKnownChain(chains.current[chain.chainId].parentId);
          if (parentName) {
            const relayProvider = new ScProvider(parentName);

            provider = new ScProvider(chainSpec, relayProvider);
          } else {
            provider = new ScProvider(chainSpec);
          }
        }
      } else if (chain.type === ConnectionType.RPC_NODE) {
        // TODO: Add possibility to select best node
        provider = new WsProvider(chains.current[chain.chainId].nodes[0].url);
      }

      if (!provider) return;
      const api = await ApiPromise.create({ provider });

      connections.current[chain.chainId] = {
        ...chains.current[chain.chainId],
        connection: chain,
        api,
      };
    });
  };

  const init = async (): Promise<void> => {
    await initConnnections();
    await connect();
  };

  const reconnect = async (chainId: HexString): Promise<void> => {
    const connection = connections.current[chainId];

    if (!connection) return;

    const { api } = connection;

    try {
      await api.disconnect();
    } catch (e) {
      // TODO: Add error handling
      console.error(e);
    }

    await api.connect();
  };

  return {
    connections: connections.current,
    init,
    reconnect,
    updateConnectionType,
  };
};
