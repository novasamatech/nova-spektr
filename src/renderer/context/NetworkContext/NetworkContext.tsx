import { createContext, PropsWithChildren, useContext, useEffect } from 'react';

import { useNetwork } from '@renderer/services/network/networkService';
import { ConnectionType, ExtendedChain } from '@renderer/services/network/common/types';
import { HexString } from '@renderer/domain/types';
import { useBalance } from '@renderer/services/balance/balanceService';
import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';

type NetworkContextProps = {
  connections: Record<string, ExtendedChain>;
  reconnect: (chainId: HexString) => void;
  updateConnectionType: (chainId: HexString, type: ConnectionType) => void;
};

const NetworkContext = createContext<NetworkContextProps>({} as NetworkContextProps);

type Props = {};

export const NetworkProvider = ({ children }: PropsWithChildren<Props>) => {
  const { init, connections, reconnect, updateConnectionType } = useNetwork();
  const { subscribeBalances } = useBalance();

  useEffect(() => {
    let ignore = false;
    if (!ignore) {
      init();
    }

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = Object.values(connections).map((connection) => {
      // TODO: Remove it when select wallet will be implemented
      return subscribeBalances(connection, TEST_PUBLIC_KEY);
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
