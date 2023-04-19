import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RpcValidation } from '@renderer/services/network/common/types';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { ChainID, HexString } from '@renderer/domain/shared-kernel';
import CustomRpcModal from './CustomRpcModal';

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    validateRpcNode: jest.fn(),
    addRpcNode: jest.fn(),
  })),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screen/Settings/Networks/ConnectionSelector/CustomRpcModal', () => {
  const defaultProps = {
    network: {
      name: 'polkadot',
      icon: 'polkadot.svg',
      genesisHash: '0x999' as HexString,
    },
    node: undefined,
    isOpen: true,
    chainId: '0x123' as ChainID,
    existingUrls: [],
    onClose: () => {},
  };

  const renderAndFillTheForm = async ({ skipName, skipAddress, props = defaultProps }: Partial<any> = {}) => {
    const formPayload = { name: 'test_name', url: 'wss://localhost:3000' };
    const user = userEvent.setup({ delay: null });

    await act(async () => {
      render(<CustomRpcModal {...props} />);
    });

    if (!skipName) {
      const name = screen.getByPlaceholderText('networkManagement.customRpc.namePlaceholder');
      await act(async () => user.type(name, formPayload.name));
    }
    if (!skipAddress) {
      const address = screen.getByPlaceholderText('networkManagement.customRpc.addressPlaceholder');
      await act(async () => user.type(address, formPayload.url));
    }

    return formPayload;
  };

  test('should render component', async () => {
    await act(async () => {
      render(<CustomRpcModal {...defaultProps} />);
    });

    const name = screen.getByPlaceholderText('networkManagement.customRpc.namePlaceholder');
    const address = screen.getByPlaceholderText('networkManagement.customRpc.addressPlaceholder');
    const submit = screen.getByRole('button', { name: 'networkManagement.customRpc.typeAddressButton' });
    expect(name).toBeInTheDocument();
    expect(address).toBeInTheDocument();
    expect(submit).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });

  test('should focus name input', async () => {
    jest.useFakeTimers();
    await act(async () => {
      render(<CustomRpcModal {...defaultProps} />);
    });
    jest.advanceTimersByTime(500);

    const name = screen.getByPlaceholderText('networkManagement.customRpc.namePlaceholder');
    expect(name).toHaveFocus();

    jest.useRealTimers();
  });

  test('should call validateRpcNode', async () => {
    const spyValidateRpc = jest.fn();

    (useNetworkContext as jest.Mock).mockImplementation(() => ({
      validateRpcNode: spyValidateRpc,
    }));

    const { url } = await renderAndFillTheForm();

    const validate = screen.getByRole('button', { name: 'networkManagement.customRpc.checkConnectionButton' });
    await act(async () => validate.click());

    expect(spyValidateRpc).toBeCalledWith(defaultProps.network.genesisHash, url);
  });

  test('should call addRpcNode', async () => {
    const spyAddRpcNode = jest.fn();

    (useNetworkContext as jest.Mock).mockImplementation(() => ({
      validateRpcNode: jest.fn().mockResolvedValue(RpcValidation.VALID),
      addRpcNode: spyAddRpcNode,
    }));

    const { name, url } = await renderAndFillTheForm();

    const validate = await screen.findByRole('button', { name: 'networkManagement.customRpc.checkConnectionButton' });
    await act(async () => validate.click());
    const save = await screen.findByRole('button', { name: 'networkManagement.customRpc.saveNodeButton' });
    await act(async () => save.click());

    expect(spyAddRpcNode).toBeCalledWith(defaultProps.chainId, { name, url: url });
  });
  test('should show error for existing address', async () => {
    await renderAndFillTheForm({
      skipName: true,
      props: { ...defaultProps, existingUrls: ['wss://localhost:3000'] },
    });

    const hint = screen.getByText('networkManagement.customRpc.addressUrlExist');
    const submit = screen.getByRole('button', { name: 'networkManagement.customRpc.typeAddressButton' });
    expect(hint).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });

  test('should call updateRpcNode for edit mode', async () => {
    const user = userEvent.setup({ delay: null });
    const node = { name: 'edit_node', url: 'wss://localhost:5000' };
    const spyUpdateRpcNode = jest.fn();

    (useNetworkContext as jest.Mock).mockImplementation(() => ({
      validateRpcNode: jest.fn().mockResolvedValue(RpcValidation.VALID),
      updateRpcNode: spyUpdateRpcNode,
    }));

    await act(async () => {
      render(<CustomRpcModal {...defaultProps} node={node} />);
    });

    const address = screen.getByPlaceholderText('networkManagement.customRpc.addressPlaceholder');
    await act(async () => user.type(address, '/api'));

    const validate = await screen.findByRole('button', { name: 'networkManagement.customRpc.checkConnectionButton' });
    await act(async () => validate.click());
    const save = await screen.findByRole('button', { name: 'networkManagement.customRpc.saveNodeButton' });
    await act(async () => save.click());

    expect(spyUpdateRpcNode).toBeCalledWith(defaultProps.chainId, node, { name: node.name, url: node.url + '/api' });
  });
});
