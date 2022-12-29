import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { RpcNode } from '@renderer/domain/chain';
import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ChainId, PublicKey } from '@renderer/domain/shared-kernel';
import { useBalance } from '@renderer/services/balance/balanceService';
import { ConnectProps, ExtendedChain, RpcValidation } from '@renderer/services/network/common/types';
import { useNetwork } from '@renderer/services/network/networkService';
import { useSubscription } from '@renderer/services/subscription/subscriptionService';
import { useAccount } from '@renderer/services/account/accountService';

type NetworkContextProps = {
  connections: Record<ChainId, ExtendedChain>;
  addRpcNode: (chainId: ChainId, rpcNode: RpcNode) => Promise<void>;
  updateRpcNode: (chainId: ChainId, oldNode: RpcNode, newNode: RpcNode) => Promise<void>;
  removeRpcNode: (chainId: ChainId, rpcNode: RpcNode) => Promise<void>;
  validateRpcNode: (genesisHash: ChainId, rpcUrl: string) => Promise<RpcValidation>;
  connectToNetwork: (props: ConnectProps) => Promise<void>;
  connectWithAutoBalance: (chainId: ChainId, attempt: number) => Promise<void>;
};

const NetworkContext = createContext<NetworkContextProps>({} as NetworkContextProps);

export const NetworkProvider = ({ children }: PropsWithChildren) => {
  const { getActiveAccounts } = useAccount();
  const networkSubscriptions = useSubscription<ChainId>();
  const { subscribe, hasSubscription, unsubscribeAll } = networkSubscriptions;
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

  const subscribeBalanceChanges = async (chain: ExtendedChain, publicKeys: PublicKey[]) => {
    if (!chain.api?.isConnected || !publicKeys.length) return;

    if (!hasSubscription(chain.chainId)) {
      const relaychain = chain.parentId && connections[chain.parentId];

      subscribe(chain.chainId, subscribeBalances(chain, relaychain, publicKeys));
      subscribe(chain.chainId, subscribeLockBalances(chain, publicKeys));
    }
  };

  useEffect(() => {
    if (!everyConnectionIsReady) return;

    (async () => {
      if (activeAccounts.length === 0) {
        await unsubscribeAll();

        return;
      }

      Object.values(connections).forEach((chain) => {
        const publicKeys = activeAccounts.reduce<PublicKey[]>((acc, account) => {
          return account.publicKey && (!account.rootId || account.chainId === chain.chainId)
            ? [...acc, account.publicKey]
            : acc;
        }, []);

        subscribeBalanceChanges(chain, publicKeys);
      });
    })();
  }, [
    Object.values(connections).filter((c) => c.connection.connectionStatus === ConnectionStatus.CONNECTED).length,
    activeAccounts.length,
  ]);

  return (
    <NetworkContext.Provider value={{ connections, connectToNetwork, connectWithAutoBalance, ...rest }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetworkContext = () => useContext<NetworkContextProps>(NetworkContext);
