import { createContext, PropsWithChildren, useContext } from 'react';

import { ConnectProps, ExtendedChain, RpcValidation, useNetwork } from '@entities/oldNetwork';
import type { RpcNode, ChainId } from '@shared/core';

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
  const { connections, setupConnections, connectToNetwork, connectWithAutoBalance, ...rest } = useNetwork();

  return (
    <NetworkContext.Provider value={{ connections, connectToNetwork, connectWithAutoBalance, ...rest }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetworkContext = () => useContext<NetworkContextProps>(NetworkContext);
