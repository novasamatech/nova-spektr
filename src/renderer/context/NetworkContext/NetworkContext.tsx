import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { RpcNode } from '@renderer/domain/chain';
import { ConnectionType } from '@renderer/domain/connection';
import { ChainId, HexString, PublicKey } from '@renderer/domain/shared-kernel';
import { useBalance } from '@renderer/services/balance/balanceService';
import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import { ConnectProps, ExtendedChain, RpcValidation } from '@renderer/services/network/common/types';
import { useNetwork } from '@renderer/services/network/networkService';
import { useWallet } from '@renderer/services/wallet/walletService';
import { useSubscription } from '@renderer/services/subscription/subscriptionService';

type NetworkContextProps = {
  connections: Record<string, ExtendedChain>;
  addRpcNode: (chainId: ChainId, rpcNode: RpcNode) => Promise<void>;
  updateRpcNode: (chainId: ChainId, oldNode: RpcNode, newNode: RpcNode) => Promise<void>;
  removeRpcNode: (chainId: ChainId, rpcNode: RpcNode) => Promise<void>;
  validateRpcNode: (genesisHash: HexString, rpcUrl: string) => Promise<RpcValidation>;
  connectToNetwork: (props: ConnectProps) => Promise<void>;
  connectWithAutoBalance: (chainId: ChainId, attempt: number) => Promise<void>;
};

const NetworkContext = createContext<NetworkContextProps>({} as NetworkContextProps);

export const NetworkProvider = ({ children }: PropsWithChildren) => {
  const [connectionsReady, setConnectionReady] = useState(false);
  const { subscribe, hasSubscription, unsubscribe } = useSubscription();
  const { connections, setupConnections, connectToNetwork, connectWithAutoBalance, ...rest } = useNetwork(unsubscribe);
  const { subscribeBalances, subscribeLockBalances } = useBalance();
  const { getActiveWallets } = useWallet();
  const activeWallets = getActiveWallets();

  useEffect(() => {
    if (connectionsReady) return;

    (async () => {
      await setupConnections();
      setConnectionReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!connectionsReady) return;

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
  }, [connectionsReady]);

  const subscribeBalanceChanges = async (chain: ExtendedChain, publicKey: PublicKey) => {
    if (!hasSubscription(chain.chainId) && chain.api?.isConnected) {
      const relaychain = chain.parentId && connections[chain.parentId];

      subscribe(chain.chainId, subscribeBalances(chain, relaychain, publicKey));
      subscribe(chain.chainId, subscribeLockBalances(chain, publicKey));
    }
  };

  useEffect(() => {
    const publicKey = activeWallets?.[0]?.mainAccounts[0]?.publicKey || TEST_PUBLIC_KEY;
    Object.values(connections).forEach((chain) => {
      subscribeBalanceChanges(chain, publicKey);
    });
  }, [connections, activeWallets]);

  return (
    <NetworkContext.Provider value={{ connections, connectToNetwork, connectWithAutoBalance, ...rest }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetworkContext = () => useContext<NetworkContextProps>(NetworkContext);
