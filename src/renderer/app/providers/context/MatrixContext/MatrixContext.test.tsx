import { act, render, screen } from '@testing-library/react';

import { Matrix } from '@renderer/shared/api/matrix';
import { ConnectionType } from '@renderer/shared/core';
import { MatrixProvider } from './MatrixContext';

jest.mock('@renderer/entities/walletConnect', () => ({
  wcModel: { events: {} },
  DEFAULT_POLKADOT_METHODS: {},
  getWalletConnectChains: jest.fn(),
}));
jest.mock('@renderer/pages/Onboarding/WalletConnect/model/wc-onboarding-model', () => ({
  wcOnboardingModel: { events: {} },
}));

jest.mock('@renderer/shared/api/matrix', () => ({ Matrix: jest.fn().mockReturnValue({}) }));

jest.mock('@renderer/entities/multisig', () => ({
  useMultisigTx: jest.fn().mockReturnValue({
    getMultisigTxs: jest.fn(),
    addMultisigTx: jest.fn(),
    updateMultisigTx: jest.fn(),
    updateCallData: jest.fn(),
  }),
  useMultisigEvent: jest.fn().mockReturnValue({
    addEvent: jest.fn(),
    updateEvent: jest.fn(),
    getEvents: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('@renderer/entities/notification', () => ({
  useNotification: jest.fn().mockReturnValue({
    addNotification: jest.fn(),
  }),
}));

jest.mock('@renderer/app/providers', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0x00': {
        chainId: '1',
        assets: [{ assetId: '1', symbol: '1' }],
        connection: {
          connectionType: ConnectionType.RPC_NODE,
        },
      },
    },
  })),
  useMultisigChainContext: jest.fn(() => ({
    addTask: () => undefined,
  })),
}));

describe('context/MatrixContext', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render children', async () => {
    (Matrix as jest.Mock).mockImplementation(() => ({
      loginFromCache: jest.fn().mockResolvedValue({}),
      setEventCallbacks: jest.fn(),
      stopClient: jest.fn(),
    }));

    await act(async () => {
      render(<MatrixProvider>children</MatrixProvider>);
    });

    expect(screen.getByText('children')).toBeInTheDocument();
  });

  test('should set eventCallbacks and login', async () => {
    const spyEventCallbacks = jest.fn();
    const spyLoginFromCache = jest.fn().mockResolvedValue({});

    (Matrix as jest.Mock).mockImplementation(() => ({
      loginFromCache: spyLoginFromCache,
      setEventCallbacks: spyEventCallbacks,
      stopClient: jest.fn(),
    }));

    await act(async () => {
      render(<MatrixProvider>children</MatrixProvider>);
    });

    expect(spyEventCallbacks).toBeCalled();
    expect(spyLoginFromCache).toBeCalled();
  });

  test('should stop Matrix client on context unmount', async () => {
    const spyStopClient = jest.fn();

    (Matrix as jest.Mock).mockImplementation(() => ({
      loginFromCache: jest.fn().mockResolvedValue({}),
      setEventCallbacks: jest.fn(),
      stopClient: spyStopClient,
    }));

    let unmount = () => {};
    await act(async () => {
      const result = render(<MatrixProvider>children</MatrixProvider>);
      unmount = result.unmount;
    });

    unmount();
    expect(spyStopClient).toBeCalled();
  });
});
