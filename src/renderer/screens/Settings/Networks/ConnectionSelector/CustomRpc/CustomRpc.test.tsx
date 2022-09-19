import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useNetworkContext } from '@renderer/context/NetworkContext';
import { ChainId, HexString } from '@renderer/domain/shared-kernel';
import CustomRpc from './CustomRpc';

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

describe('screen/Settings/Networks/ConnectionSelector/CustomRpc', () => {
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
      render(<CustomRpc {...props} />);
    });

    if (!skipName) {
      const name = screen.getByPlaceholderText('Type a name');
      await user.type(name, formPayload.name);
    }
    if (!skipAddress) {
      const address = screen.getByPlaceholderText('Type or paste the node address');
      await user.type(address, formPayload.address);
    }

    return formPayload;
  };

  test('should render component', async () => {
    await act(async () => {
      render(<CustomRpc {...defaultProps} />);
    });

    const name = screen.getByPlaceholderText('Type a name');
    const address = screen.getByPlaceholderText('Type or paste the node address');
    const submit = screen.getByRole('button', { name: 'Type or paste an address...' });
    expect(name).toBeInTheDocument();
    expect(address).toBeInTheDocument();
    expect(submit).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });

  test('should focus name input', async () => {
    jest.useFakeTimers();

    await act(async () => {
      render(<CustomRpc {...defaultProps} />);
    });

    jest.advanceTimersByTime(500);

    const name = screen.getByPlaceholderText('Type a name');
    expect(name).toHaveFocus();

    jest.useRealTimers();
  });

  test('should call validateRpcNode', async () => {
    const spyValidateRpc = jest.fn();

    (useNetworkContext as jest.Mock).mockImplementation(() => ({
      validateRpcNode: spyValidateRpc,
    }));

    const { address } = await renderAndFillTheForm();

    const submit = screen.getByRole('button', { name: 'Check connection' });
    await act(async () => submit.click());

    expect(spyValidateRpc).toBeCalledWith(defaultProps.genesisHash, address);
  });

  test('should call validateRpcNode', async () => {
    const spyAddRpcNode = jest.fn();

    (useNetworkContext as jest.Mock).mockImplementation(() => ({
      validateRpcNode: jest.fn().mockResolvedValue(true),
      addRpcNode: spyAddRpcNode,
    }));

    const { name, address } = await renderAndFillTheForm();

    const validate = screen.getByRole('button', { name: 'Check connection' });
    await act(async () => validate.click());
    const save = screen.getByRole('button', { name: 'Save Custom Node' });
    await act(async () => save.click());

    expect(spyAddRpcNode).toBeCalledWith(defaultProps.chainId, { name, url: address });
  });

  test('should show error for existing address', async () => {
    await renderAndFillTheForm({
      skipName: true,
      props: { ...defaultProps, existingUrls: ['wss://localhost:3000'] },
    });

    const hint = screen.getByText('Url address already exists');
    const submit = screen.getByRole('button', { name: 'Type or paste an address...' });
    expect(hint).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });
});
