import { useUnit } from 'effector-react';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { useBalance } from '@renderer/entities/asset';
import { ConnectProps, ExtendedChain, RpcValidation, useNetwork } from '@renderer/entities/network';
import { useSubscription } from '@renderer/services/subscription/subscriptionService';
import { usePrevious } from '@renderer/shared/lib/hooks';
import type { RpcNode, ChainId, AccountId } from '@renderer/shared/core';
import { ConnectionStatus, ConnectionType } from '@renderer/shared/core';
import { walletModel, accountUtils } from '@renderer/entities/wallet';

type NetworkContextProps = {
  connections: Record<ChainId, ExtendedChain>;
  addRpcNode: (chainId: ChainId, rpcNode: RpcNode) => Promise<void>;
  updateRpcNode: (chainId: ChainId, oldNode: RpcNode, newNode: RpcNode) => Promise<void>;
  removeRpcNode: (chainId: ChainId, rpcNode: RpcNode) => Promise<void>;
  validateRpcNode: (chainId: ChainId, rpcUrl: string) => Promise<RpcValidation>;
  connectToNetwork: (props: ConnectProps) => Promise<void>;
  connectWithAutoBalance: (chainId: ChainId, attempt: number) => Promise<void>;
  getParachains: (chainId: ChainId) => ExtendedChain[];
};

const NetworkContext = createContext<NetworkContextProps>({} as NetworkContextProps);

export const NetworkProvider = ({ children }: PropsWithChildren) => {
  const activeAccounts = useUnit(walletModel.$activeAccounts);

  const networkSubscriptions = useSubscription<ChainId>();
  const { subscribe, unsubscribe, hasSubscription, unsubscribeAll } = networkSubscriptions;
  const { connections, setupConnections, connectToNetwork, connectWithAutoBalance, ...rest } =
    useNetwork(networkSubscriptions);
  const { subscribeBalances, subscribeLockBalances } = useBalance();

  const [everyConnectionIsReady, setEveryConnectionIsReady] = useState(false);

  useEffect(() => {
    setupConnections().then(() => setEveryConnectionIsReady(true));
  }, []);

  useEffect(() => {
    if (!everyConnectionIsReady) return;

    const requestConnections = Object.values(connections).map(({ connection }) => {
      const { chainId, connectionType, activeNode } = connection;

      if (connectionType === ConnectionType.DISABLED) return;
      if (connectionType === ConnectionType.AUTO_BALANCE) {
        return connectWithAutoBalance(chainId, 0);
      }

      return connectToNetwork({ chainId, type: connectionType, node: activeNode });
    });

    Promise.allSettled(requestConnections).catch(console.warn);

    return () => {
      const requests = Object.values(connections).map((connection) => connection.disconnect || (() => {}));
      Promise.allSettled(requests).catch((error) => console.warn('Disconnect all error ==> ', error));
    };
  }, [everyConnectionIsReady]);

  const subscribeBalanceChanges = async (chain: ExtendedChain, accountIds: AccountId[]) => {
    if (!chain.api?.isConnected || !accountIds.length) return;

    if (!hasSubscription(chain.chainId)) {
      unsubscribe(chain.chainId);
    }

    const relaychain = chain.parentId && connections[chain.parentId];

    subscribe(chain.chainId, subscribeBalances(chain, accountIds, relaychain));
    subscribe(chain.chainId, subscribeLockBalances(chain, accountIds));
  };

  const connectedConnections = Object.values(connections).filter(
    (c) => c.connection.connectionStatus === ConnectionStatus.CONNECTED,
  );

  const previousConnectedConnections = usePrevious(connectedConnections);

  useEffect(() => {
    if (activeAccounts.length === 0) {
      unsubscribeAll();

      return;
    }

    // subscribe to new connections
    const newConnections = connectedConnections.filter((c) => !previousConnectedConnections?.includes(c));

    newConnections.forEach((chain) => {
      subscribeBalanceChanges(chain, accountUtils.getAllAccountIds(activeAccounts, chain.connection.chainId));
    });

    // unsubscribe from removed connections
    const removedConnections = previousConnectedConnections?.filter((c) => !connectedConnections.includes(c));
    removedConnections?.forEach((chain) => {
      unsubscribe(chain.chainId);
    });
  }, [connectedConnections.length, activeAccounts]);

  return (
    <NetworkContext.Provider value={{ connections, connectToNetwork, connectWithAutoBalance, ...rest }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetworkContext = () => useContext<NetworkContextProps>(NetworkContext);
