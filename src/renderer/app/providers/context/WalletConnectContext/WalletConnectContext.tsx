import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Client from '@walletconnect/sign-client';
import { PairingTypes, SessionTypes } from '@walletconnect/types';
import { WalletConnectModal } from '@walletconnect/modal';
import { RELAYER_EVENTS } from '@walletconnect/core';
import { getSdkError } from '@walletconnect/utils';

import {
  DEFAULT_APP_METADATA,
  DEFAULT_LOGGER,
  DEFAULT_POLKADOT_EVENTS,
  DEFAULT_POLKADOT_METHODS,
  DEFAULT_PROJECT_ID,
  DEFAULT_RELAY_URL,
} from './const';
import { useChains } from '@renderer/entities/network';

/**
 * Types
 */
interface IContext {
  client: Client | undefined;
  session: SessionTypes.Struct | undefined;
  connect: (pairing?: { topic: string }) => Promise<void>;
  disconnect: () => Promise<void>;
  isInitializing: boolean;
  chains: string[];
  pairings: PairingTypes.Struct[];
  accounts: string[];
  setChains: any;
  relayerRegion: string;
  setRelayerRegion: any;
}

/**
 * Context
 */
export const WalletConnectContext = createContext<IContext>({} as IContext);

/**
 * Web3Modal Config
 */
const walletConnectModal = new WalletConnectModal({
  projectId: DEFAULT_PROJECT_ID,
  themeMode: 'light',
});

/**
 * Provider
 */
export const WalletConnectProvider = ({ children }: { children: ReactNode | ReactNode[] }) => {
  const { getChainsData } = useChains();

  const [client, setClient] = useState<Client>();
  const [pairings, setPairings] = useState<PairingTypes.Struct[]>([]);
  const [session, setSession] = useState<SessionTypes.Struct>();

  const [isInitializing, setIsInitializing] = useState(false);
  const prevRelayerValue = useRef<string>('');

  const [accounts, setAccounts] = useState<string[]>([]);
  const [chains, setChains] = useState<string[]>([]);
  const [relayerRegion, setRelayerRegion] = useState<string>(DEFAULT_RELAY_URL!);

  const reset = () => {
    setSession(undefined);
    setAccounts([]);
    setChains([]);
    setRelayerRegion(DEFAULT_RELAY_URL!);
  };

  const onSessionConnected = useCallback(async (_session: SessionTypes.Struct) => {
    const allNamespaceAccounts = Object.values(_session.namespaces)
      .map((namespace) => namespace.accounts)
      .flat();
    const allNamespaceChains = Object.keys(_session.namespaces);

    setSession(_session);
    setChains(allNamespaceChains);
    setAccounts(allNamespaceAccounts);
  }, []);

  const connect = useCallback(
    async (pairing: any) => {
      if (typeof client === 'undefined') {
        throw new Error('WalletConnect is not initialized');
      }
      console.log('connect, pairing topic is:', pairing?.topic);
      const chains = await getChainsData();

      try {
        const optionalNamespaces = {
          polkadot: {
            methods: [DEFAULT_POLKADOT_METHODS.POLKADOT_SIGN_TRANSACTION],
            //eslint-disable-next-line i18next/no-literal-string
            chains: chains.map((c) => `polkadot:${c.chainId.slice(2, 34)}`),
            events: [DEFAULT_POLKADOT_EVENTS.CHAIN_CHANGED, DEFAULT_POLKADOT_EVENTS.ACCOUNTS_CHANGED],
          },
        };

        const { uri, approval } = await client.connect({
          pairingTopic: pairing?.topic,
          optionalNamespaces,
        });

        // Open QRCode modal if a URI was returned (i.e. we're not connecting an existing pairing).
        if (uri) {
          walletConnectModal.openModal({ uri });
        }

        const session = await approval();
        console.log('Established session:', session);

        await onSessionConnected(session);

        setPairings(client.pairing.getAll({ active: true }));
      } catch (e) {
        console.error(e);
      } finally {
        walletConnectModal.closeModal();
      }
    },
    [chains, client, onSessionConnected],
  );

  const disconnect = useCallback(async () => {
    if (typeof client === 'undefined') {
      throw new Error('WalletConnect is not initialized');
    }
    if (typeof session === 'undefined') {
      throw new Error('Session is not connected');
    }

    try {
      await client.disconnect({
        topic: session.topic,
        reason: getSdkError('USER_DISCONNECTED'),
      });
    } catch (error) {
      return;
    }

    reset();
  }, [client, session]);

  const _subscribeToEvents = useCallback(
    async (_client: Client) => {
      if (typeof _client === 'undefined') {
        throw new Error('WalletConnect is not initialized');
      }

      _client.on('session_ping', (args) => {
        console.log('EVENT', 'session_ping', args);
      });

      _client.on('session_event', (args) => {
        console.log('EVENT', 'session_event', args);
      });

      _client.on('session_update', ({ topic, params }) => {
        console.log('EVENT', 'session_update', { topic, params });
        const { namespaces } = params;
        const _session = _client.session.get(topic);
        const updatedSession = { ..._session, namespaces };
        onSessionConnected(updatedSession);
      });

      _client.on('session_delete', () => {
        console.log('EVENT', 'session_delete');
        reset();
      });
    },
    [onSessionConnected],
  );

  const _checkPersistedState = useCallback(
    async (_client: Client) => {
      if (typeof _client === 'undefined') {
        throw new Error('WalletConnect is not initialized');
      }

      setPairings(_client.pairing.getAll({ active: true }));
      console.log('RESTORED PAIRINGS: ', _client.pairing.getAll({ active: true }));

      if (typeof session !== 'undefined') return;

      if (_client.session.length) {
        const lastKeyIndex = _client.session.keys.length - 1;
        const _session = _client.session.get(_client.session.keys[lastKeyIndex]);
        console.log('RESTORED SESSION:', _session);
        await onSessionConnected(_session);

        return _session;
      }
    },
    [session, onSessionConnected],
  );

  const _logClientId = useCallback(async (_client: Client) => {
    if (typeof _client === 'undefined') {
      throw new Error('WalletConnect is not initialized');
    }
    try {
      const clientId = await _client.core.crypto.getClientId();
      console.log('WalletConnect ClientID: ', clientId);
      localStorage.setItem('WALLETCONNECT_CLIENT_ID', clientId);
    } catch (error) {
      console.error('Failed to set WalletConnect clientId in localStorage: ', error);
    }
  }, []);

  const createClient = useCallback(async () => {
    try {
      setIsInitializing(true);
      const _client = await Client.init({
        logger: DEFAULT_LOGGER,
        relayUrl: relayerRegion,
        projectId: DEFAULT_PROJECT_ID,
        metadata: DEFAULT_APP_METADATA,
      });

      setClient(_client);
      prevRelayerValue.current = relayerRegion;
      await _subscribeToEvents(_client);
      await _checkPersistedState(_client);
      await _logClientId(_client);
    } catch (err) {
      console.log(err);
    } finally {
      setIsInitializing(false);
    }
  }, [_checkPersistedState, _subscribeToEvents, _logClientId, relayerRegion]);

  useEffect(() => {
    if (!client) {
      createClient();
    } else if (prevRelayerValue.current && prevRelayerValue.current !== relayerRegion) {
      client.core.relayer.restartTransport(relayerRegion);
      prevRelayerValue.current = relayerRegion;
    }
  }, [createClient, relayerRegion, client]);

  useEffect(() => {
    if (!client) return;
    client.core.relayer.on(RELAYER_EVENTS.connect, () => {
      console.log('Network connection is restored');
    });

    client.core.relayer.on(RELAYER_EVENTS.disconnect, () => {
      console.log('Network connection lost');
    });
  }, [client]);

  const value = useMemo(
    () => ({
      pairings,
      isInitializing,
      accounts,
      chains,
      relayerRegion,
      client,
      session,
      connect,
      disconnect,
      setChains,
      setRelayerRegion,
    }),
    [
      pairings,
      isInitializing,
      accounts,
      chains,
      relayerRegion,
      client,
      session,
      connect,
      disconnect,
      setChains,
      setRelayerRegion,
    ],
  );

  return (
    <WalletConnectContext.Provider
      value={{
        ...value,
      }}
    >
      {children}
    </WalletConnectContext.Provider>
  );
};

export const useWalletConnectClient = () => {
  const context = useContext(WalletConnectContext);

  if (context === undefined) {
    throw new Error('useWalletConnectClient must be used within a ClientContextProvider');
  }

  return context;
};
