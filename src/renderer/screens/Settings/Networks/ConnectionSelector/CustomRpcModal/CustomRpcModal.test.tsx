import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useNetworkContext } from '@renderer/context/NetworkContext';
import { ChainId, HexString } from '@renderer/domain/shared-kernel';
import CustomRpcModal from './CustomRpcModal';

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    validateRpcNode: jest.fn(),
    addRpcNode: jest.fn(),
  })),
}));

window.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screen/Settings/Networks/ConnectionSelector/CustomRpcModal', () => {
  const defaultProps = {
    isOpen: true,
    chainId: '0x123' as ChainId,
    genesisHash: '0x999' as HexString,
    existingUrls: [],
    onClose: () => {},
  };

  const renderAndFillTheForm = async ({ skipName, skipAddress, props = defaultProps }: Partial<any> = {}) => {
    const formPayload = { name: 'test_name', address: 'wss://localhost:3000' };
    const user = userEvent.setup();

    await act(async () => {
      render(<CustomRpcModal {...props} />);
    });

    if (!skipName) {
      const name = screen.getByPlaceholderText('networkManagement.customRpc.namePlaceholder');
      await act(async () => await user.type(name, formPayload.name));
    }
    if (!skipAddress) {
      const address = screen.getByPlaceholderText('networkManagement.customRpc.addressPlaceholder');
      await act(async () => await user.type(address, formPayload.address));
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

    const { address } = await renderAndFillTheForm();

    const validate = screen.getByRole('button', { name: 'networkManagement.customRpc.checkConnectionButton' });
    await act(async () => validate.click());

    expect(spyValidateRpc).toBeCalledWith(defaultProps.genesisHash, address);
  });

  test('should call addRpcNode', async () => {
    const spyAddRpcNode = jest.fn();

    (useNetworkContext as jest.Mock).mockImplementation(() => ({
      validateRpcNode: jest.fn().mockResolvedValue(true),
      addRpcNode: spyAddRpcNode,
    }));

    const { name, address } = await renderAndFillTheForm();

    const validate = screen.getByRole('button', { name: 'networkManagement.customRpc.checkConnectionButton' });
    await act(async () => validate.click());
    const save = screen.getByRole('button', { name: 'networkManagement.customRpc.saveNodeButton' });
    await act(async () => save.click());

    expect(spyAddRpcNode).toBeCalledWith(defaultProps.chainId, { name, url: address });
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
});
