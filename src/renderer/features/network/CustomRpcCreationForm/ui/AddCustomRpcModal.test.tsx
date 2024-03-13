import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AddCustomRpcModal } from './AddCustomRpcModal';
import { ExtendedChain } from '@entities/network';
import { networkService, RpcValidation } from '@shared/api/network';
import { manageNetworkModel } from '../../../../pages/Settings/Networks/model/manage-network-model';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('pages/Settings/Networks/CustomRpcModal', () => {
  const defaultProps = {
    network: {
      name: 'Westend',
      chainId: '0x999',
      nodes: [{ name: 'existing_node', url: 'wss://localhost:6000' }],
      connection: { customNodes: [] },
    } as unknown as ExtendedChain,
    node: undefined,
    isOpen: true,
    onClose: () => {},
  };

  const renderAndFillTheForm = async ({ payload, skipName, skipAddress, props = defaultProps }: Partial<any> = {}) => {
    const formPayload = payload || { name: 'test_name', url: 'wss://localhost:3000' };
    const user = userEvent.setup({ delay: null });

    await act(async () => {
      render(<AddCustomRpcModal {...props} />);
    });

    if (!skipName) {
      const name = screen.getByPlaceholderText('settings.networks.namePlaceholder');
      await act(async () => user.type(name, formPayload.name));
    }
    if (!skipAddress) {
      const address = screen.getByPlaceholderText('settings.networks.addressPlaceholder');
      await act(async () => user.type(address, formPayload.url));
    }

    return formPayload;
  };

  test('should render component', async () => {
    await act(async () => {
      render(<AddCustomRpcModal {...defaultProps} />);
    });

    const name = screen.getByPlaceholderText('settings.networks.namePlaceholder');
    const address = screen.getByPlaceholderText('settings.networks.addressPlaceholder');
    const submit = screen.getByRole('button', { name: 'settings.networks.addNodeButton' });
    expect(name).toBeInTheDocument();
    expect(address).toBeInTheDocument();
    expect(submit).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });

  test('should focus name input', async () => {
    jest.useFakeTimers();
    await act(async () => {
      render(<AddCustomRpcModal {...defaultProps} />);
    });
    jest.advanceTimersByTime(500);

    const name = screen.getByPlaceholderText('settings.networks.namePlaceholder');
    expect(name).toHaveFocus();

    jest.useRealTimers();
  });

  test('should disable submit button during submission', async () => {
    jest.spyOn(networkService, 'validateRpcNode').mockRejectedValue(new Error('error'));

    await renderAndFillTheForm();

    const button = screen.getByRole('button', { name: 'settings.networks.addNodeButton' });
    expect(button).toBeEnabled();

    await act(async () => button.click());

    expect(button).toBeDisabled();
  });

  test('should call validateRpcNode', async () => {
    const spyValidateRpc = jest.fn().mockResolvedValue(RpcValidation.VALID);

    jest.spyOn(networkService, 'validateRpcNode').mockImplementation(spyValidateRpc);

    const { url } = await renderAndFillTheForm();

    const button = screen.getByRole('button', { name: 'settings.networks.addNodeButton' });
    await act(async () => button.click());

    expect(spyValidateRpc).toBeCalledWith(defaultProps.network.chainId, url);
  });

  test('should call addRpcNode', async () => {
    const spyAddRpcNode = jest.fn();

    jest.spyOn(networkService, 'validateRpcNode').mockResolvedValue(RpcValidation.VALID);
    jest.spyOn(manageNetworkModel.events, 'rpcNodeAdded').mockImplementation(spyAddRpcNode);

    const { name, url } = await renderAndFillTheForm();

    const button = await screen.findByRole('button', { name: 'settings.networks.addNodeButton' });
    await act(async () => button.click());
    await act(async () => button.click());

    expect(spyAddRpcNode).toBeCalledWith({
      chainId: defaultProps.network.chainId,
      rpcNode: { name, url: url },
    });
  });

  test('should show error for existing address', async () => {
    await renderAndFillTheForm({
      payload: { name: 'existing_node', url: 'wss://localhost:6000' },
      props: { ...defaultProps },
    });

    const hint = screen.getByText('settings.networks.nodeExist');
    const submit = screen.getByRole('button', { name: 'settings.networks.addNodeButton' });
    expect(hint).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });

  test('should call updateRpcNode for edit mode', async () => {
    const user = userEvent.setup({ delay: null });
    const node = { name: 'edit_node', url: 'wss://localhost:5000' };
    const spyUpdateRpcNode = jest.fn();

    jest.spyOn(networkService, 'validateRpcNode').mockResolvedValue(RpcValidation.VALID);
    jest.spyOn(manageNetworkModel.events, 'rpcNodeUpdated').mockImplementation(spyUpdateRpcNode);

    await act(async () => {
      render(<AddCustomRpcModal {...defaultProps} node={node} />);
    });

    const address = screen.getByPlaceholderText('settings.networks.addressPlaceholder');
    await act(async () => user.type(address, '/api'));

    const button = await screen.findByRole('button', { name: 'settings.networks.editNodeButton' });
    await act(async () => button.click());
    await act(async () => button.click());

    expect(spyUpdateRpcNode).toBeCalledWith({
      chainId: defaultProps.network.chainId,
      oldNode: node,
      rpcNode: {
        name: node.name,
        url: node.url + '/api',
      },
    });
  });
});
