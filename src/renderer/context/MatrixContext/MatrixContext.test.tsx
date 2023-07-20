import { act, render, screen } from '@testing-library/react';

import Matrix from '@renderer/services/matrix';
import { MatrixProvider } from './MatrixContext';
import { ConnectionType } from '@renderer/domain/connection';

jest.mock('@renderer/services/matrix', () => jest.fn().mockReturnValue({}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getAccounts: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('@renderer/services/multisigTx/multisigTxService', () => ({
  useMultisigTx: jest.fn().mockReturnValue({
    getMultisigTxs: jest.fn(),
    addMultisigTx: jest.fn(),
    updateMultisigTx: jest.fn(),
    updateCallData: jest.fn(),
  }),
}));

jest.mock('@renderer/services/contact/contactService', () => ({
  useContact: jest.fn().mockReturnValue({
    getContacts: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('@renderer/services/notification/notificationService', () => ({
  useNotification: jest.fn().mockReturnValue({
    addNotification: jest.fn(),
  }),
}));

jest.mock('@renderer/services/multisigEvent/multisigEventService', () => ({
  useMultisigEvent: jest.fn().mockReturnValue({
    addEvent: jest.fn(),
    updateEvent: jest.fn(),
    getEvents: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0x0000000000000000000000000000000000000000': {
        chainId: '1',
        assets: [{ assetId: '1', symbol: '1' }],
        connection: {
          connectionType: ConnectionType.RPC_NODE,
        },
      },
    },
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
