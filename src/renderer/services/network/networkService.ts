import { ApiPromise, ScProvider, WsProvider } from '@polkadot/api';
import * as Sc from '@substrate/connect';
import { WellKnownChain } from '@substrate/connect';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import keyBy from 'lodash/keyBy';
import { useRef, useState } from 'react';
import { start as smoldotStart } from 'smoldot';

import { Chain, RpcNode } from '@renderer/domain/chain';
import { Connection, ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ChainId } from '@renderer/domain/shared-kernel';
import storage from '@renderer/services/storage';
import { ISubscriptionService } from '../subscription/common/types';
import { useChainSpec } from './chainSpecService';
import { useChains } from './chainsService';
import { AUTO_BALANCE_TIMEOUT, MAX_ATTEMPTS, PROGRESSION_BASE } from './common/constants';
import { ConnectionsMap, ConnectProps, INetworkService, RpcValidation } from './common/types';
import polkadot from './polkadot.json';

export const useNetwork = (networkSubscription?: ISubscriptionService<ChainId>): INetworkService => {
  const chains = useRef<Record<ChainId, Chain>>({});
  const [connections, setConnections] = useState<ConnectionsMap>({});

  const { getChainsData, sortChains } = useChains();
  const { getKnownChain, getLightClientChains } = useChainSpec();

  const connectionStorage = storage.connectTo('connections');

  if (!connectionStorage) {
    throw new Error('=== 🔴 Connections storage in not defined 🔴 ===');
  }

  const { getConnections, addConnections, clearConnections, updateConnection } = connectionStorage;

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
      updateConnection({ ...currentConnection.connection, ...updates }).catch(console.warn);

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
    (chainId: ChainId, provider?: ProviderInterface, api?: ApiPromise, timeoutId?: any) =>
    async (switchNetwork: boolean): Promise<void> => {
      await networkSubscription?.unsubscribe(chainId);

      if (timeoutId) clearTimeout(timeoutId);

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
    const lightClientChains = getLightClientChains();

    const updatedActiveNode = (chainId: ChainId, connection: Connection, defaultNode: RpcNode): RpcNode | undefined => {
      const { activeNode, connectionType } = connection;
      if (!activeNode) return undefined;

      const [insideCustomNodes, insideChainNodes] = [connection.customNodes || [], chains.current[chainId].nodes].map(
        (nodeGroup) => nodeGroup.find((node) => node.name === activeNode.name && node.url === activeNode.url),
      );

      if (!insideCustomNodes && !insideChainNodes) {
        return connectionType === ConnectionType.RPC_NODE ? defaultNode : undefined;
      }

      return activeNode;
    };

    return Object.values(chains.current).reduce<Connection[]>((acc, { chainId, nodes }) => {
      if (connectionData[chainId]) {
        acc.push({
          ...connectionData[chainId],
          activeNode: updatedActiveNode(chainId, connectionData[chainId], nodes[0]),
          connectionStatus: ConnectionStatus.NONE,
        });
      } else {
        const connectionType = getKnownChain(chainId) ? ConnectionType.LIGHT_CLIENT : ConnectionType.AUTO_BALANCE;
        const activeNode = connectionType === ConnectionType.AUTO_BALANCE ? nodes[0] : undefined;

        acc.push({
          chainId,
          connectionType,
          activeNode,
          canUseLightClient: lightClientChains.includes(chainId),
          connectionStatus: ConnectionStatus.NONE,
        });
      }

      return acc;
    }, []);
  };

  const getExtendConnections = async (): Promise<ConnectionsMap> => {
    const currentConnections = await getConnections();
    const connectionData = keyBy(currentConnections, 'chainId');

    return Object.values(chains.current).reduce<ConnectionsMap>((acc, chain) => {
      acc[chain.chainId] = {
        ...chains.current[chain.chainId],
        connection: connectionData[chain.chainId],
      };

      return acc;
    }, {});
  };

  const createSubstrateProvider = (chainId: ChainId): ProviderInterface | undefined => {
    const knownChainId = getKnownChain(chainId);

    if (knownChainId) {
      let polkadotChainspec = localStorage.getItem('polkadot');
      // if (polkadotChainspec) {
      //   console.log("polkadot chainspec");
      //   console.log(polkadotChainspec);
      //   return new ScProvider(Sc, polkadotChainspec);
      // } else {
        return new ScProvider(Sc, knownChainId);
      // }
    } else {
      throw new Error('Parachains do not support Substrate Connect yet');
    }
  };

  const createWebsocketProvider = (rpcUrl: string): ProviderInterface => {
    // TODO: handle limited retries provider = new WsProvider(node.address, 5000, {1}, 11000);
    return new WsProvider(rpcUrl, 2000);
  };

  const subscribeConnected = (chainId: ChainId, provider: ProviderInterface, type: ConnectionType, node?: RpcNode) => {
    const handler = async () => {
      console.info('🟢 connected ==> ', chainId);

      // smoldotChain.sendJsonRpc(
      //   JSON.stringify({
      //     jsonrpc: "2.0",
      //     id: "best-block-header:" + this.#nextRpcRqId,
      //     method: "chainHead_unstable_header",
      //     params: [
      //       chainInfo.readySubscriptionId,
      //       chainInfo.finalizedBlockHashHex,
      //     ],
      //   }),
      // )
      const api = await ApiPromise.create({ provider, throwOnConnect: true, throwOnUnknown: true });
      if (provider instanceof ScProvider) {
        console.log(provider);

        const client = Sc.createScClient({ forceEmbeddedNode: false, embeddedNodeConfig: { maxLogLevel: 3 } });
        let chain = await client.addWellKnownChain(WellKnownChain.polkadot, (response) => {
          console.log(response);
          const jsonResponse = JSON.parse(response);
          if (jsonResponse.id === '1') {
            localStorage.setItem('polkadot', jsonResponse.result);
          }
        });
        chain.sendJsonRpc(
            JSON.stringify({
              jsonrpc: '2.0',
            id: '1',
              method: 'chainHead_unstable_finalizedDatabase',
              params: [
                100000, //todo calculate
              ],
            })
          )
      }
      //#15806372
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
      //#15806346
      //#15371728
    };

    provider.on('connected', handler);
  };

  const subscribeDisconnected = (chainId: ChainId, provider: ProviderInterface) => {
    const handler = async () => {
      console.info('🔶 disconnected ==> ', chainId);
    };

    provider.on('disconnected', handler);
  };

  const subscribeError = (chainId: ChainId, provider: ProviderInterface, onError?: () => void) => {
    const handler = () => {
      console.info('🔴 error ==> ', chainId);

      updateConnectionState(chainId, {
        connectionStatus: ConnectionStatus.ERROR,
      });

      onError?.();
    };

    provider.on('error', handler);
  };

  const connectWithAutoBalance = async (chainId: ChainId, attempt = 0): Promise<void> => {
    if (Number.isNaN(attempt)) attempt = 0;

    const currentTimeout = AUTO_BALANCE_TIMEOUT * (PROGRESSION_BASE ^ attempt % MAX_ATTEMPTS);

    const timeoutId = setTimeout(() => {
      const currentConnection = connections[chainId];

      if (currentConnection.connection.connectionType === ConnectionType.DISABLED) return;

      const nodes = [...connections[chainId].nodes, ...(connections[chainId].connection.customNodes || [])];

      const node = nodes[Math.floor(attempt / MAX_ATTEMPTS) % nodes.length];

      connectToNetwork({ chainId, type: ConnectionType.AUTO_BALANCE, node, attempt, timeoutId });
    }, currentTimeout);
  };

  const connectToNetwork = async (props: ConnectProps): Promise<void> => {
    const { chainId, type, node, timeoutId } = props;
    const connection = connections[chainId];
    if (!connection || type === ConnectionType.DISABLED) return;

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
      if (localStorage.getItem('polkadot')) {
        console.log("sync from database")
        const client = smoldotStart({
          cpuRateLimit: 0.5, // Politely limit the CPU usage of the smoldot background worker.
        });

        await client.addChain({ chainSpec: JSON.stringify(polkadot), databaseContent: localStorage.getItem('polkadot') });
      }
      provider.instance = createSubstrateProvider(chainId);

    } else if ([ConnectionType.RPC_NODE, ConnectionType.AUTO_BALANCE].includes(type) && node) {
      provider.instance = createWebsocketProvider(node.url);
    }

    setConnections((currentConnections) => ({
      ...currentConnections,
      [connection.chainId]: {
        ...currentConnections[chainId],
        disconnect: disconnectFromNetwork(chainId, provider.instance, undefined, timeoutId),
      },
    }));

    let autoBalanceStarted = false;
    const onAutoBalanceError = async () => {
      const { attempt, timeoutId } = props;
      if (autoBalanceStarted || type !== ConnectionType.AUTO_BALANCE) return;
      autoBalanceStarted = true;

      await disconnectFromNetwork(chainId, provider.instance, undefined, timeoutId)(true);
      await connectWithAutoBalance(chainId, attempt! + 1);
    };

    if (provider.instance) {
      subscribeConnected(chainId, provider.instance, type, node);
      subscribeDisconnected(chainId, provider.instance);
      subscribeError(chainId, provider.instance, onAutoBalanceError);

      if (provider.isScProvider) {
        console.log('try to connect to sc provider');
        await provider.instance.connect({ forceEmbeddedNode: false, embeddedNodeConfig: { maxLogLevel: 3 } });
      }
    } else {
      updateConnectionState(chainId, {
        activeNode: node,
        connectionType: type,
        connectionStatus: ConnectionStatus.ERROR,
      });
    }
  };

  const validateRpcNode = (genesisHash: ChainId, rpcUrl: string): Promise<RpcValidation> => {
    return new Promise((resolve) => {
      const provider = new WsProvider(rpcUrl);

      provider.on('connected', async () => {
        let isNetworkMatch = false;
        try {
          const api = await ApiPromise.create({ provider, throwOnConnect: true, throwOnUnknown: true });
          isNetworkMatch = genesisHash === api.genesisHash.toHex();

          api.disconnect().catch(console.warn);
        } catch (error) {
          console.warn(error);
        }
        provider.disconnect().catch(console.warn);
        resolve(isNetworkMatch ? RpcValidation.VALID : RpcValidation.WRONG_NETWORK);
      });

      provider.on('error', async () => {
        try {
          await provider.disconnect();
        } catch (error) {
          console.warn(error);
        }
        resolve(RpcValidation.INVALID);
      });
    });
  };

  const addRpcNode = async (chainId: ChainId, rpcNode: RpcNode): Promise<void> => {
    const connection = connections[chainId];
    if (!connection) return;

    await updateConnectionState(chainId, {
      customNodes: (connection.connection.customNodes || []).concat(rpcNode),
    });
  };

  const updateRpcNode = async (chainId: ChainId, oldNode: RpcNode, newRpc: RpcNode): Promise<void> => {
    const connection = connections[chainId];
    if (!connection) return;

    await updateConnectionState(chainId, {
      customNodes: (connection.connection.customNodes || []).map((node) => {
        if (node.url === oldNode.url && node.name === oldNode.name) return newRpc;

        return node;
      }),
    });
  };

  const removeRpcNode = async (chainId: ChainId, rpcNode: RpcNode): Promise<void> => {
    const connection = connections[chainId];
    if (!connection) return;

    await updateConnectionState(chainId, {
      customNodes: (connection.connection.customNodes || []).filter((node) => node.url !== rpcNode.url),
    });
  };

  const setupConnections = async (): Promise<void> => {
    try {
      const chainsData = await getChainsData();
      chains.current = keyBy(sortChains(chainsData), 'chainId');

      const newConnections = await getNewConnections();
      await clearConnections();
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
    connectWithAutoBalance,
    addRpcNode,
    updateRpcNode,
    removeRpcNode,
    validateRpcNode,
  };
};
