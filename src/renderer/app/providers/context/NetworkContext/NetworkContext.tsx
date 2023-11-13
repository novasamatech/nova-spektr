import { useUnit } from 'effector-react';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { useBalance } from '@entities/asset';
import { ConnectProps, ExtendedChain, RpcValidation, useNetwork } from '@entities/network';
import { useSubscription } from '@renderer/services/subscription/subscriptionService';
import { usePrevious } from '@shared/lib/hooks';
import type { RpcNode, ChainId, AccountId } from '@shared/core';
import { ConnectionStatus, ConnectionType } from '@shared/core';
import { walletModel, accountUtils } from '@entities/wallet';

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

  const { subscribe, unsubscribe, unsubscribeAll } = useSubscription<ChainId>();
  const { connections, setupConnections, connectToNetwork, connectWithAutoBalance, ...rest } = useNetwork();
  const { subscribeBalances, subscribeLockBalances } = useBalance();

  const [everyConnectionIsReady, setEveryConnectionIsReady] = useState(false);

  const connectionValues = Object.values(connections);
  const activeConnections = connectionValues.filter(
    (c) => c.connection.connectionStatus === ConnectionStatus.CONNECTED,
  );
  const prevConnections = usePrevious(activeConnections);

  useEffect(() => {
    setupConnections().then(() => setEveryConnectionIsReady(true));
  }, []);

  useEffect(() => {
    if (!everyConnectionIsReady) return;

    const requestConnections = connectionValues.map(({ connection }) => {
      const { chainId, connectionType, activeNode } = connection;

      if (connectionType === ConnectionType.DISABLED) return;
      if (connectionType === ConnectionType.AUTO_BALANCE) {
        return connectWithAutoBalance(chainId, 0);
      }

      return connectToNetwork({ chainId, type: connectionType, node: activeNode });
    });

    Promise.allSettled(requestConnections).catch(console.warn);

    return () => {
      const requests = connectionValues.map((connection) => connection.disconnect || (() => {}));
      Promise.allSettled(requests).catch((error) => console.warn('Disconnect all error ==> ', error));
    };
  }, [everyConnectionIsReady]);

  const subscribeBalanceChanges = (chain: ExtendedChain, accountIds: AccountId[]) => {
    if (!chain.api?.isConnected || !accountIds.length) return;

    const relaychain = chain.parentId && connections[chain.parentId];

    Promise.all([subscribeBalances(chain, accountIds, relaychain), subscribeLockBalances(chain, accountIds)]).then(
      ([unsubBalances, unsubLocks]) => {
        subscribe(chain.chainId, unsubBalances);
        subscribe(chain.chainId, unsubLocks);
      },
    );
  };

  // subscribe to active accounts
  useEffect(() => {
    if (activeAccounts.length > 0) {
      activeConnections.forEach((chain) => {
        subscribeBalanceChanges(chain, accountUtils.getAllAccountIds(activeAccounts, chain.connection.chainId));
      });
    }

    return () => {
      unsubscribeAll();
    };
  }, [activeAccounts]);

  // subscribe to new connections
  useEffect(() => {
    const newConnections = activeConnections.filter((c) => !prevConnections?.includes(c));

    newConnections?.forEach((chain) => {
      subscribeBalanceChanges(chain, accountUtils.getAllAccountIds(activeAccounts, chain.connection.chainId));
    });
  }, [activeConnections.length]);

  // unsubscribe from removed connections
  useEffect(() => {
    const removedConnections = prevConnections?.filter((c) => !activeConnections.includes(c));

    removedConnections?.forEach((chain) => {
      unsubscribe(chain.chainId);
    });
  }, [activeConnections.length]);

  return (
    <NetworkContext.Provider value={{ connections, connectToNetwork, connectWithAutoBalance, ...rest }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetworkContext = () => useContext<NetworkContextProps>(NetworkContext);
