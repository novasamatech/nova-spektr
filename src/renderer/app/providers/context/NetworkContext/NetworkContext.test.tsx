import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';

import { useBalance } from '@renderer/entities/asset';
import { useNetwork } from '@renderer/entities/network';
import { NetworkProvider, useNetworkContext } from './NetworkContext';
import { AccountType, ConnectionStatus, ConnectionType } from '@renderer/shared/core';
import { walletModel } from '@renderer/entities/wallet';
import { TEST_ACCOUNT_ID } from '@renderer/shared/lib/utils';

jest.mock('@renderer/app/providers', () => ({
  useMatrix: jest.fn(),
}));

jest.mock('@renderer/entities/network', () => ({
  useNetwork: jest.fn().mockReturnValue({
    connections: {},
    setupConnections: jest.fn().mockResolvedValue({}),
  }),
}));

jest.mock('@renderer/entities/asset', () => ({
  useBalance: jest.fn().mockReturnValue({
    subscribeBalances: jest.fn(),
    subscribeLockBalances: jest.fn(),
  }),
}));

jest.mock('@renderer/services/subscription/subscriptionService', () => ({
  useSubscription: jest.fn().mockReturnValue({
    subscribe: jest.fn(),
    hasSubscription: jest.fn(),
    unsubscribe: jest.fn(),
    unsubscribeAll: jest.fn(),
  }),
}));

describe('context/NetworkContext', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render children', async () => {
    await act(async () => {
      render(<NetworkProvider>children</NetworkProvider>);
    });

    expect(screen.getByText('children')).toBeInTheDocument();
  });

  test('should setup connections', async () => {
    const spySetupConnections = jest.fn().mockResolvedValue({});
    (useNetwork as jest.Mock).mockImplementation(() => ({
      connections: {},
      setupConnections: spySetupConnections,
    }));

    await act(async () => {
      render(<NetworkProvider>children</NetworkProvider>);
    });

    expect(spySetupConnections).toBeCalled();
  });

  test('should connect to available networks', async () => {
    const spyConnectToNetwork = jest.fn();
    const connection = { chainId: '0x123', connectionType: ConnectionType.RPC_NODE };

    (useNetwork as jest.Mock).mockImplementation(() => ({
      connections: { [connection.chainId]: { connection } },
      setupConnections: jest.fn().mockResolvedValue({}),
      connectToNetwork: spyConnectToNetwork,
    }));

    await act(async () => {
      render(<NetworkProvider>children</NetworkProvider>);
    });

    expect(spyConnectToNetwork).toBeCalledTimes(1);
    expect(spyConnectToNetwork).toBeCalledWith({ chainId: connection.chainId, type: connection.connectionType });
  });

  test('should connect with auto balance', async () => {
    const spyConnectWithAutoBalance = jest.fn();
    const connection = { chainId: '0x123', connectionType: ConnectionType.AUTO_BALANCE };

    (useNetwork as jest.Mock).mockImplementation(() => ({
      connections: { [connection.chainId]: { connection } },
      setupConnections: jest.fn().mockResolvedValue({}),
      connectWithAutoBalance: spyConnectWithAutoBalance,
    }));

    await act(async () => {
      render(<NetworkProvider>children</NetworkProvider>);
    });

    expect(spyConnectWithAutoBalance).toBeCalledTimes(1);
    expect(spyConnectWithAutoBalance).toBeCalledWith(connection.chainId, 0);
  });

  test('should start balance subscription', async () => {
    const spySubscribeBalances = jest.fn();
    const spySubscribeLockBalances = jest.fn();
    const connection = {
      chainId: '0x123',
      connectionType: ConnectionType.RPC_NODE,
      connectionStatus: ConnectionStatus.CONNECTED,
    };

    (useNetwork as jest.Mock).mockImplementation(() => ({
      connections: { [connection.chainId]: { api: { isConnected: true }, connection } },
      setupConnections: jest.fn().mockResolvedValue({}),
      connectToNetwork: jest.fn(),
    }));
    (useBalance as jest.Mock).mockImplementation(() => ({
      subscribeBalances: spySubscribeBalances,
      subscribeLockBalances: spySubscribeLockBalances,
    }));

    const scope = fork({
      values: new Map().set(walletModel.$accounts, [
        { name: 'Test Wallet', type: AccountType.BASE, accountId: TEST_ACCOUNT_ID },
      ]),
    });

    await act(async () => {
      render(
        <Provider value={scope}>
          <NetworkProvider>children</NetworkProvider>
        </Provider>,
      );
    });

    expect(spySubscribeBalances).toBeCalled();
    expect(spySubscribeLockBalances).toBeCalled();
  });
});

describe('context/NetworkContext/useNetworkContext', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should have defined functions', () => {
    const { result } = renderHook(() => useNetworkContext(), { wrapper: NetworkProvider });
    const { connections, connectToNetwork, addRpcNode, removeRpcNode, validateRpcNode } = result.current;

    waitFor(() => {
      expect(connections).toBeDefined();
      expect(connectToNetwork).toBeDefined();
      expect(addRpcNode).toBeDefined();
      expect(removeRpcNode).toBeDefined();
      expect(validateRpcNode).toBeDefined();
    });
  });
});
