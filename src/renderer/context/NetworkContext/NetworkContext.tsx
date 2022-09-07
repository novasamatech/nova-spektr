import { createContext, PropsWithChildren, useContext, useEffect, useRef } from 'react';

import { ConnectionType } from '@renderer/domain/connection';
import { ChainId } from '@renderer/domain/shared-kernel';
import { useBalance } from '@renderer/services/balance/balanceService';
import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { useNetwork } from '@renderer/services/network/networkService';
import { useWallet } from '@renderer/services/wallet/walletService';

type NetworkContextProps = {
  connections: Record<string, ExtendedChain>;
  reconnect: (chainId: ChainId) => void;
  updateConnectionType: (chainId: ChainId, type: ConnectionType) => Promise<void>;
};

const NetworkContext = createContext<NetworkContextProps>({} as NetworkContextProps);

export const NetworkProvider = ({ children }: PropsWithChildren) => {
  const { init, connections, reconnect, updateConnectionType } = useNetwork();
  const { subscribeBalances, subscribeLockBalances } = useBalance();
  const { getActiveWallets } = useWallet();
  const initedRef = useRef(false);
  const activeWallets = getActiveWallets();

  useEffect(() => {
    if (!initedRef.current) {
      init();
    }

    return () => {
      initedRef.current = true;
    };
  }, []);

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

  return (
    <NetworkContext.Provider value={{ connections, reconnect, updateConnectionType }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetworkContext = () => useContext<NetworkContextProps>(NetworkContext);
