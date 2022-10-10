import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { RpcNode } from '@renderer/domain/chain';
import { ConnectionType } from '@renderer/domain/connection';
import { ChainId, HexString } from '@renderer/domain/shared-kernel';
import { useBalance } from '@renderer/services/balance/balanceService';
import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import { ExtendedChain, RpcValidation } from '@renderer/services/network/common/types';
import { useNetwork } from '@renderer/services/network/networkService';
import { useWallet } from '@renderer/services/wallet/walletService';

type NetworkContextProps = {
  connections: Record<string, ExtendedChain>;
  addRpcNode: (chainId: ChainId, rpcNode: RpcNode) => Promise<void>;
  updateRpcNode: (chainId: ChainId, oldNode: RpcNode, newNode: RpcNode) => Promise<void>;
  removeRpcNode: (chainId: ChainId, rpcNode: RpcNode) => Promise<void>;
  validateRpcNode: (genesisHash: HexString, rpcUrl: string) => Promise<RpcValidation>;
  connectToNetwork: (chainId: ChainId, type: ConnectionType, node?: RpcNode) => Promise<void>;
};

const NetworkContext = createContext<NetworkContextProps>({} as NetworkContextProps);

export const NetworkProvider = ({ children }: PropsWithChildren) => {
  const [connectionsReady, setConnectionReady] = useState(false);

  const { connections, setupConnections, connectToNetwork, ...rest } = useNetwork();
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

        return connectToNetwork(chainId, connectionType, activeNode);
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

  useEffect(() => {
    const unsubscribeBalance = Object.values(connections).reduce((acc, chain) => {
      if (chain.api?.isConnected) {
        const relaychain = chain.parentId && connections[chain.parentId];
        // TODO: Remove TEST_PUBLIC_KEY when select wallet will be implemented
        const publicKey = (activeWallets && activeWallets[0]?.mainAccounts[0]?.publicKey) || TEST_PUBLIC_KEY;
        acc.push(subscribeBalances(chain, relaychain, publicKey));
      }

      return acc;
    }, [] as Promise<any>[]);

    const unsubscribeLockBalance = Object.values(connections).reduce((acc, chain) => {
      if (chain.api?.isConnected) {
        // TODO: Remove TEST_PUBLIC_KEY when select wallet will be implemented
        const publicKey = (activeWallets && activeWallets[0]?.mainAccounts[0]?.publicKey) || TEST_PUBLIC_KEY;
        acc.push(subscribeLockBalances(chain, publicKey));
      }

      return acc;
    }, [] as Promise<any>[]);

    return () => {
      Promise.all(unsubscribeBalance).catch(console.warn);
      Promise.all(unsubscribeLockBalance).catch(console.warn);
    };
  }, [connections, activeWallets]);

  return (
    <NetworkContext.Provider value={{ connections, connectToNetwork, ...rest }}>{children}</NetworkContext.Provider>
  );
};

export const useNetworkContext = () => useContext<NetworkContextProps>(NetworkContext);
