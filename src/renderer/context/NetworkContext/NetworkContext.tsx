import { createContext, PropsWithChildren, useContext, useEffect } from 'react';

import { useNetwork } from '@renderer/services/network/networkService';
import { ConnectionType, ExtendedChain } from '@renderer/services/network/types';
import { HexString } from '@renderer/domain/types';

type NetworkContextProps = {
  connections: Record<string, ExtendedChain>;
  reconnect: (chainId: HexString) => void;
  updateConnectionType: (chainId: HexString, type: ConnectionType) => void;
};

const NetworkContext = createContext<NetworkContextProps>({} as NetworkContextProps);

type Props = {};

export const NetworkProvider = ({ children }: PropsWithChildren<Props>) => {
  const { init, connections, reconnect, updateConnectionType } = useNetwork();

  useEffect(() => {
    let ignore = false;
    if (!ignore) {
      init();
    }

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ connections, reconnect, updateConnectionType }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetworkContext = () => useContext<NetworkContextProps>(NetworkContext);
