import { createContext, PropsWithChildren, useContext, useEffect, useRef } from 'react';

import { ConnectionType } from '@renderer/domain/connection';
import { ChainId } from '@renderer/domain/shared-kernel';
import { useBalance } from '@renderer/services/balance/balanceService';
import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { useNetwork } from '@renderer/services/network/networkService';

type NetworkContextProps = {
  connections: Record<string, ExtendedChain>;
  reconnect: (chainId: ChainId) => void;
  updateConnectionType: (chainId: ChainId, type: ConnectionType) => Promise<void>;
};

const NetworkContext = createContext<NetworkContextProps>({} as NetworkContextProps);

export const NetworkProvider = ({ children }: PropsWithChildren) => {
  const { init, connections, reconnect, updateConnectionType } = useNetwork();
  const { subscribeBalances } = useBalance();
  const initedRef = useRef(false);

  useEffect(() => {
    if (!initedRef.current) {
      init();
    }

    return () => {
      initedRef.current = true;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = Object.values(connections).map((chain) => {
      const relayChain = chain.parentId && connections[chain.parentId];

      // TODO: Remove TEST_PUBLIC_KEY when select wallet will be implemented
      return subscribeBalances(chain, relayChain, TEST_PUBLIC_KEY);
    });

    return () => {
      Promise.all(unsubscribe).catch((e) => console.error(e));
    };
  }, [connections]);

  return (
    <NetworkContext.Provider value={{ connections, reconnect, updateConnectionType }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetworkContext = () => useContext<NetworkContextProps>(NetworkContext);
