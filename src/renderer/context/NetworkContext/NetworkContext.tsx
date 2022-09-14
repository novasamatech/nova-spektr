import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { ConnectionNode, ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ChainId } from '@renderer/domain/shared-kernel';
import { useBalance } from '@renderer/services/balance/balanceService';
import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { useNetwork } from '@renderer/services/network/networkService';
import { useWallet } from '@renderer/services/wallet/walletService';

type NetworkContextProps = {
  connections: Record<string, ExtendedChain>;
  reconnect: (chainId: ChainId) => void;
  connectToNetwork: (chainId: ChainId, type: ConnectionType, node?: ConnectionNode) => Promise<void>;
  updateConnectionType: (chainId: ChainId, type: ConnectionType) => Promise<void>;
  updateConnectionStatus: (chainId: ChainId, status: ConnectionStatus) => Promise<void>;
};

const NetworkContext = createContext<NetworkContextProps>({} as NetworkContextProps);

export const NetworkProvider = ({ children }: PropsWithChildren) => {
  const [connectionsReady, setConnectionReady] = useState(false);

  const { init, connections, reconnect, connectToNetwork, updateConnectionType, updateConnectionStatus } = useNetwork();
  const { subscribeBalances, subscribeLockBalances } = useBalance();
  const { getActiveWallets } = useWallet();
  const activeWallets = getActiveWallets();

  useEffect(() => {
    if (connectionsReady) return;

    (async () => {
      await init();
      setConnectionReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!connectionsReady) return;

    Object.values(connections).forEach(({ connection }) => {
      const { chainId, connectionType, activeNode } = connection;

      if (connectionType === ConnectionType.DISABLED) return;

      connectToNetwork(chainId, connectionType, activeNode);
    });
  }, [connectionsReady]);

  useEffect(() => {
    const unsubscribeBalance = Object.values(connections).map((chain) => {
      const relayChain = chain.parentId && connections[chain.parentId];
      // TODO: Remove TEST_PUBLIC_KEY when select wallet will be implemented
      const publicKey = (activeWallets && activeWallets[0]?.mainAccounts[0]?.publicKey) || TEST_PUBLIC_KEY;

      return subscribeBalances(chain, relayChain, publicKey);
    });

    const unsubscribeLockBalance = Object.values(connections).map((chain) => {
      // TODO: Remove TEST_PUBLIC_KEY when select wallet will be implemented
      const publicKey = (activeWallets && activeWallets[0]?.mainAccounts[0]?.publicKey) || TEST_PUBLIC_KEY;

      return subscribeLockBalances(chain, publicKey);
    });

    return () => {
      Promise.all(unsubscribeBalance).catch((e) => console.error(e));
      Promise.all(unsubscribeLockBalance).catch((e) => console.error(e));
    };
  }, [connections, activeWallets]);

  const value: NetworkContextProps = {
    connections,
    reconnect,
    connectToNetwork,
    updateConnectionType,
    updateConnectionStatus,
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
};

export const useNetworkContext = () => useContext<NetworkContextProps>(NetworkContext);
