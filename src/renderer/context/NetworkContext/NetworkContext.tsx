import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { RpcNode } from '@renderer/domain/chain';
import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ChainId, AccountId } from '@renderer/domain/shared-kernel';
import { useBalance } from '@renderer/services/balance/balanceService';
import { ConnectProps, ExtendedChain, RpcValidation } from '@renderer/services/network/common/types';
import { useNetwork } from '@renderer/services/network/networkService';
import { useSubscription } from '@renderer/services/subscription/subscriptionService';
import { useAccount } from '@renderer/services/account/accountService';
import { usePrevious } from '@renderer/shared/hooks';

type NetworkContextProps = {
  connections: Record<ChainId, ExtendedChain>;
  addRpcNode: (chainId: ChainId, rpcNode: RpcNode) => Promise<void>;
  updateRpcNode: (chainId: ChainId, oldNode: RpcNode, newNode: RpcNode) => Promise<void>;
  removeRpcNode: (chainId: ChainId, rpcNode: RpcNode) => Promise<void>;
  validateRpcNode: (chainId: ChainId, rpcUrl: string) => Promise<RpcValidation>;
  connectToNetwork: (props: ConnectProps) => Promise<void>;
  connectWithAutoBalance: (chainId: ChainId, attempt: number) => Promise<void>;
};

const NetworkContext = createContext<NetworkContextProps>({} as NetworkContextProps);

export const NetworkProvider = ({ children }: PropsWithChildren) => {
  const { getActiveAccounts } = useAccount();
  const networkSubscriptions = useSubscription<ChainId>();
  const { subscribe, unsubscribe, hasSubscription, unsubscribeAll } = networkSubscriptions;
  const { connections, setupConnections, connectToNetwork, connectWithAutoBalance, ...rest } =
    useNetwork(networkSubscriptions);
  const { subscribeBalances, subscribeLockBalances } = useBalance();

  const activeAccounts = getActiveAccounts();

  const [everyConnectionIsReady, setEveryConnectionIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      await setupConnections();
      setEveryConnectionIsReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!everyConnectionIsReady) return;

    const startNetworks = async () => {
      const requestConnections = Object.values(connections).map(({ connection }) => {
        const { chainId, connectionType, activeNode } = connection;

        if (connectionType === ConnectionType.DISABLED) return;
        if (connectionType === ConnectionType.AUTO_BALANCE) {
          return connectWithAutoBalance(chainId, 0);
        }

        return connectToNetwork({ chainId, type: connectionType, node: activeNode });
      });

      try {
        await Promise.allSettled(requestConnections);
      } catch (error) {
        console.warn(error);
      }
    };

    startNetworks();

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

    subscribe(chain.chainId, subscribeBalances(chain, relaychain, accountIds));
    subscribe(chain.chainId, subscribeLockBalances(chain, accountIds));
  };

  const connectedConnections = Object.values(connections).filter(
    (c) => c.connection.connectionStatus === ConnectionStatus.CONNECTED,
  );

  const previousConnectedConnections = usePrevious(connectedConnections);
  const previousAccounts = usePrevious(activeAccounts);

  const getAccountIds = (chainId: ChainId): AccountId[] => {
    return activeAccounts.reduce<AccountId[]>((acc, account) => {
      if (account.accountId && (!account.rootId || account.chainId === chainId)) {
        acc.push(account.accountId);
      }

      return acc;
    }, []);
  };

  useEffect(() => {
    (async () => {
      if (activeAccounts.length === 0) {
        await unsubscribeAll();

        return;
      }

      if (previousAccounts?.length !== activeAccounts.length) {
        connectedConnections.forEach((chain) => {
          const accountIds = getAccountIds(chain.chainId);
          subscribeBalanceChanges(chain, accountIds);
        });
      }

      // subscribe to new connections
      const newConnections = connectedConnections.filter((c) => !previousConnectedConnections?.includes(c));

      newConnections.forEach((chain) => {
        const accountIds = getAccountIds(chain.chainId);
        subscribeBalanceChanges(chain, accountIds);
      });

      // unsubscribe from removed connections
      const removedConnections = previousConnectedConnections?.filter((c) => !connectedConnections.includes(c));
      removedConnections?.forEach((chain) => {
        unsubscribe(chain.chainId);
      });
    })();
  }, [connectedConnections.length, activeAccounts.length]);

  return (
    <NetworkContext.Provider value={{ connections, connectToNetwork, connectWithAutoBalance, ...rest }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetworkContext = () => useContext<NetworkContextProps>(NetworkContext);
