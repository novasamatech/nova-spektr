import { act, render, screen } from '@testing-library/react';
import { Provider } from 'effector-react';
import { fork } from 'effector';

import { MatrixProvider } from './MatrixContext';
import { matrixModel } from '@entities/matrix';

jest.mock('@shared/api/matrix', () => ({ Matrix: jest.fn().mockReturnValue({}) }));

jest.mock('@entities/multisig', () => ({
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

jest.mock('@app/providers', () => ({
  useMultisigChainContext: jest.fn(() => ({
    addTask: () => undefined,
  })),
}));

describe('context/MatrixContext', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render children', async () => {
    const scope = fork({
      values: new Map().set(matrixModel.$matrix, {
        loginFromCache: jest.fn().mockResolvedValue({}),
        setEventCallbacks: jest.fn(),
        stopClient: jest.fn(),
      }),
    });
    await act(async () => {
      render(
        <Provider value={scope}>
          <MatrixProvider>children</MatrixProvider>
        </Provider>,
      );
    });

    expect(screen.getByText('children')).toBeInTheDocument();
  });

  test('should set eventCallbacks', async () => {
    const spyEventCallbacks = jest.fn();

    const scope = fork({
      values: new Map().set(matrixModel.$matrix, {
        setEventCallbacks: spyEventCallbacks,
        stopClient: jest.fn(),
      }),
    });
    await act(async () => {
      render(
        <Provider value={scope}>
          <MatrixProvider>children</MatrixProvider>
        </Provider>,
      );
    });

    expect(spyEventCallbacks).toHaveBeenCalled();
  });

  test('should stop Matrix client on context unmount', async () => {
    const spyStopClient = jest.fn();

    const scope = fork({
      values: new Map().set(matrixModel.$matrix, {
        setEventCallbacks: jest.fn(),
        stopClient: spyStopClient,
      }),
    });
    let unmount = () => {};
    await act(async () => {
      const result = render(
        <Provider value={scope}>
          <MatrixProvider>children</MatrixProvider>
        </Provider>,
      );
      unmount = result.unmount;
    });

    unmount();
    expect(spyStopClient).toHaveBeenCalled();
  });
});
