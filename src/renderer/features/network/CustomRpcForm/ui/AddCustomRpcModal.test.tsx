import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fork } from 'effector';
import { Provider } from 'effector-react';

import { AddCustomRpcModal } from './AddCustomRpcModal';
import { addCustomRpcModel } from '../model/add-custom-rpc-model';
import { ConnectionStatus } from '@shared/core';
import { RpcCheckResult } from '../lib/types';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('pages/Settings/Networks/AddCustomRpcModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: () => {},
  };

  const network = {
    chainId: '0x01',
    connection: { chainId: '0x01', id: '0x01' },
    connectionStatus: ConnectionStatus.CONNECTED,
    nodes: [{ url: 'wss://some-rpc.com', name: 'node' }],
  };

  test('should render component', async () => {
    const scope = fork({
      values: new Map().set(addCustomRpcModel.$isProcessStarted, true).set(addCustomRpcModel.$selectedNetwork, network),
    });

    await act(async () => {
      render(
        <Provider value={scope}>
          <AddCustomRpcModal {...defaultProps} />
        </Provider>,
      );
    });

    const name = screen.getByPlaceholderText('settings.networks.namePlaceholder');
    const address = screen.getByPlaceholderText('settings.networks.addressPlaceholder');
    const submit = screen.getByRole('button', { name: 'settings.networks.addNodeButton' });
    expect(name).toBeInTheDocument();
    expect(address).toBeInTheDocument();
    expect(submit).toBeInTheDocument();
  });

  test('should disable submit button during submission', async () => {
    const scope = fork({
      values: new Map().set(addCustomRpcModel.$isProcessStarted, true).set(addCustomRpcModel.$selectedNetwork, network),
    });

    await act(async () => {
      render(
        <Provider value={scope}>
          <AddCustomRpcModal {...defaultProps} />
        </Provider>,
      );
    });

    const formPayload = { name: 'test_name', url: 'wss://localhost:3000' };
    const user = userEvent.setup({ delay: null });

    const name = screen.getByPlaceholderText('settings.networks.namePlaceholder');
    await act(async () => user.type(name, formPayload.name));

    const address = screen.getByPlaceholderText('settings.networks.addressPlaceholder');
    await act(async () => user.type(address, formPayload.url));

    const button = screen.getByRole('button', { name: 'settings.networks.addNodeButton' });
    expect(button).toBeEnabled();

    await act(async () => button.click());

    expect(button).toBeDisabled();
  });

  test('should show error for existing address', async () => {
    const scope = fork({
      values: new Map()
        .set(addCustomRpcModel.$isProcessStarted, true)
        .set(addCustomRpcModel.$selectedNetwork, network)
        .set(addCustomRpcModel.$isNodeExist, true),
    });

    await act(async () => {
      render(
        <Provider value={scope}>
          <AddCustomRpcModal {...defaultProps} />
        </Provider>,
      );
    });

    const hint = screen.getByText('settings.networks.nodeExist');
    const submit = screen.getByRole('button', { name: 'settings.networks.addNodeButton' });
    expect(hint).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });

  test('should show error for invalid address', async () => {
    const scope = fork({
      values: new Map()
        .set(addCustomRpcModel.$isProcessStarted, true)
        .set(addCustomRpcModel.$selectedNetwork, network)
        .set(addCustomRpcModel.$rpcConnectivityResult, RpcCheckResult.INVALID),
    });

    await act(async () => {
      render(
        <Provider value={scope}>
          <AddCustomRpcModal {...defaultProps} />
        </Provider>,
      );
    });

    const error = screen.getByText('settings.networks.addressNoConnect');
    const submit = screen.getByRole('button', { name: 'settings.networks.addNodeButton' });
    expect(error).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });

  test('should show error for wrong network', async () => {
    const scope = fork({
      values: new Map()
        .set(addCustomRpcModel.$isProcessStarted, true)
        .set(addCustomRpcModel.$selectedNetwork, network)
        .set(addCustomRpcModel.$rpcConnectivityResult, RpcCheckResult.WRONG_NETWORK),
    });

    await act(async () => {
      render(
        <Provider value={scope}>
          <AddCustomRpcModal {...defaultProps} />
        </Provider>,
      );
    });

    const error = screen.getByText('settings.networks.addressWrongNetwork');
    expect(error).toBeInTheDocument();
  });
});
