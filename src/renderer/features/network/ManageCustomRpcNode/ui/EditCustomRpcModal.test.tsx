import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fork } from 'effector';
import { Provider } from 'effector-react';

import { EditCustomRpcModal } from './EditCustomRpcModal';
import { editCustomRpcModel } from '../model/edit-custom-rpc-model';
import { ConnectionStatus, RpcNode } from '@shared/core';
import { RpcConnectivityResult } from '../lib/custom-rpc-types';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('pages/Settings/Networks/EditCustomRpcModal', () => {
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

  const mockNode = { url: 'wss://some-rpc.com', name: 'node' } as RpcNode;

  test('should render component', async () => {
    const scope = fork({
      values: new Map()
        .set(editCustomRpcModel.$isProcessStarted, true)
        .set(editCustomRpcModel.$selectedNetwork, network)
        .set(editCustomRpcModel.$editCustomRpcForm.fields.url.$value, mockNode.url)
        .set(editCustomRpcModel.$editCustomRpcForm.fields.name.$value, mockNode.name),
    });

    await act(async () => {
      render(
        <Provider value={scope}>
          <EditCustomRpcModal {...defaultProps} />
        </Provider>,
      );
    });

    const name = screen.getByPlaceholderText('settings.networks.namePlaceholder');
    const address = screen.getByPlaceholderText('settings.networks.addressPlaceholder');
    const submit = screen.getByRole('button', { name: 'settings.networks.editNodeButton' });
    expect(name).toBeInTheDocument();
    expect(name).toHaveValue(mockNode.name);
    expect(address).toBeInTheDocument();
    expect(address).toHaveValue(mockNode.url);
    expect(submit).toBeInTheDocument();
  });

  test('should disable submit button during submission', async () => {
    const scope = fork({
      values: new Map()
        .set(editCustomRpcModel.$isProcessStarted, true)
        .set(editCustomRpcModel.$selectedNetwork, network)
        .set(editCustomRpcModel.$editCustomRpcForm.fields.url.$value, mockNode.url)
        .set(editCustomRpcModel.$editCustomRpcForm.fields.name.$value, mockNode.name),
    });

    await act(async () => {
      render(
        <Provider value={scope}>
          <EditCustomRpcModal {...defaultProps} />
        </Provider>,
      );
    });

    const formPayload = { name: 'test_name', url: 'wss://localhost:3000' };
    const user = userEvent.setup({ delay: null });

    const name = screen.getByPlaceholderText('settings.networks.namePlaceholder');
    await act(async () => user.type(name, formPayload.name));

    const address = screen.getByPlaceholderText('settings.networks.addressPlaceholder');
    await act(async () => user.type(address, formPayload.url));

    const button = screen.getByRole('button', { name: 'settings.networks.editNodeButton' });
    expect(button).toBeEnabled();

    await act(async () => button.click());

    expect(button).toBeDisabled();
  });

  test('should show error for invalid address', async () => {
    const scope = fork({
      values: new Map()
        .set(editCustomRpcModel.$isProcessStarted, true)
        .set(editCustomRpcModel.$selectedNetwork, network)
        .set(editCustomRpcModel.$editCustomRpcForm.fields.url.$value, mockNode.url)
        .set(editCustomRpcModel.$editCustomRpcForm.fields.name.$value, mockNode.name)
        .set(editCustomRpcModel.$rpcConnectivityResult, RpcConnectivityResult.INVALID),
    });

    await act(async () => {
      render(
        <Provider value={scope}>
          <EditCustomRpcModal {...defaultProps} />
        </Provider>,
      );
    });

    const error = screen.getByText('settings.networks.addressNoConnect');
    expect(error).toBeInTheDocument();
  });

  test('should show error for wrong network', async () => {
    const scope = fork({
      values: new Map()
        .set(editCustomRpcModel.$isProcessStarted, true)
        .set(editCustomRpcModel.$selectedNetwork, network)
        .set(editCustomRpcModel.$editCustomRpcForm.fields.url.$value, mockNode.url)
        .set(editCustomRpcModel.$editCustomRpcForm.fields.name.$value, mockNode.name)
        .set(editCustomRpcModel.$rpcConnectivityResult, RpcConnectivityResult.WRONG_NETWORK),
    });

    await act(async () => {
      render(
        <Provider value={scope}>
          <EditCustomRpcModal {...defaultProps} />
        </Provider>,
      );
    });

    const error = screen.getByText('settings.networks.addressWrongNetwork');
    expect(error).toBeInTheDocument();
  });
});
