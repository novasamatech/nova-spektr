import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useNetworkContext } from '@renderer/context/NetworkContext';
import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import useToggle from '@renderer/hooks/useToggle';
import CustomRpcModal from '../CustomRpcModal/CustomRpcModal';
import { ExtendedChain } from '@renderer/services/network/common/types';
import ConnectionSelector from './Selector';

const connectWithAutoBalanceSpy = jest.fn();

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connectToNetwork: jest.fn(),
    connectWithAutoBalance: connectWithAutoBalanceSpy,
  })),
}));

const confirmSpy = jest.fn();

jest.mock('@renderer/context/ConfirmContext', () => ({
  useConfirmContext: jest.fn(() => ({
    confirm: confirmSpy,
  })),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/hooks/useToggle');

jest.mock('../CustomRpcModal/CustomRpcModal', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('screen/Settings/Networks/ConnectionSelector/Selector', () => {
  const defaultNetwork: ExtendedChain = {
    addressPrefix: 0,
    assets: [],
    chainId: '0x123',
    icon: '',
    name: '',
    nodes: [
      { url: 'wss://westend-rpc.polkadot.io', name: 'Parity node' },
      { url: 'wss://westend.api.onfinality.io/public-ws', name: 'OnFinality node' },
    ],
    connection: {
      chainId: '0x123',
      canUseLightClient: false,
      connectionStatus: ConnectionStatus.NONE,
      connectionType: ConnectionType.DISABLED,
    },
  };

  const lightClientNetworks: ExtendedChain = {
    ...defaultNetwork,
    connection: {
      ...defaultNetwork.connection,
      canUseLightClient: true,
    },
  };

  const connectedNetwork: ExtendedChain = {
    ...defaultNetwork,
    connection: {
      ...defaultNetwork.connection,
      connectionStatus: ConnectionStatus.CONNECTED,
      connectionType: ConnectionType.RPC_NODE,
      activeNode: { url: 'wss://westend-rpc.polkadot.io', name: 'Parity node' },
    },
  };

  const withCustomNetwork: ExtendedChain = {
    ...connectedNetwork,
    nodes: [{ url: 'wss://westend.api.onfinality.io/public-ws', name: 'OnFinality node' }],
    connection: {
      ...connectedNetwork.connection,
      activeNode: { url: 'wss://westend.api.onfinality.io/public-ws', name: 'OnFinality node' },
      customNodes: [{ url: 'wss://westend-rpc.polkadot.io', name: 'My custom node' }],
    },
  };

  const withCustomActiveNetwork: ExtendedChain = {
    ...withCustomNetwork,
    connection: {
      ...withCustomNetwork.connection,
      activeNode: { url: 'wss://westend-rpc.polkadot.io', name: 'My custom node' },
    },
  };

  beforeEach(() => {
    (useToggle as jest.Mock).mockReturnValue([false, () => {}]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    render(<ConnectionSelector networkItem={defaultNetwork} />);

    const text = screen.getByText('networkManagement.selectConnection.selectConnectionLabel');
    expect(text).toBeInTheDocument();
  });

  test('should render list of nodes', async () => {
    render(<ConnectionSelector networkItem={lightClientNetworks} />);

    const button = screen.getByRole('button');
    await act(async () => button.click());

    const nodes = screen.getAllByRole('radio');
    expect(nodes).toHaveLength(4);
  });

  test('should select auto balance option', async () => {
    render(<ConnectionSelector networkItem={lightClientNetworks} />);

    const button = screen.getByRole('button');
    await act(async () => button.click());

    const autoBalance = screen.getByText('networkManagement.autoBalanceLabel');
    await act(async () => autoBalance.click());

    expect(connectWithAutoBalanceSpy).toBeCalled();
  });

  test('should not show light client option', async () => {
    render(<ConnectionSelector networkItem={defaultNetwork} />);

    const selectorBtn = screen.getByRole('button');
    await act(async () => selectorBtn.click());

    const lightClient = screen.queryByText('networkManagement.lightClientLabel');
    expect(lightClient).not.toBeInTheDocument();
  });

  test('should call open custom rpc component', async () => {
    const spyToggle = jest.fn();
    (useToggle as jest.Mock).mockReturnValue([false, spyToggle]);

    render(<ConnectionSelector networkItem={defaultNetwork} />);

    const selectorBtn = screen.getByRole('button');
    await act(async () => selectorBtn.click());

    const addRpcBtn = screen.getByRole('button', { name: /networkManagement.addCustomNodeButton/ });
    await act(async () => addRpcBtn.click());

    expect(spyToggle).toBeCalled();
  });

  test('should call change modal for current node', async () => {
    render(<ConnectionSelector networkItem={connectedNetwork} />);

    const selectorBtn = screen.getByRole('button');
    await act(async () => selectorBtn.click());

    const disableButton = screen.getByRole('button', { name: /networkManagement.disableNetworkButton/ });
    await act(async () => disableButton.click());

    expect(confirmSpy).toBeCalled();
  });

  test('should call edit modal for custom node', async () => {
    const spyToggle = jest.fn();
    (useToggle as jest.Mock).mockReturnValue([false, spyToggle]);

    const user = userEvent.setup();
    render(<ConnectionSelector networkItem={withCustomNetwork} />);

    const selectorBtn = screen.getByRole('button');
    await act(async () => selectorBtn.click());

    const row = screen.getByText('wss://westend-rpc.polkadot.io');
    await user.hover(row);

    const editNode = screen.getByRole('button', { name: 'edit-outline.svg' });
    await act(async () => editNode.click());

    expect(spyToggle).toBeCalled();
  });

  test('should call remove modal for custom node', async () => {
    const user = userEvent.setup();
    render(<ConnectionSelector networkItem={withCustomNetwork} />);

    const selectorBtn = screen.getByRole('button');
    await act(async () => selectorBtn.click());

    const row = screen.getByText('wss://westend-rpc.polkadot.io');
    await user.hover(row);

    const editNode = screen.getByRole('button', { name: 'delete-outline.svg' });
    await act(async () => editNode.click());

    expect(confirmSpy).toBeCalled();
  });

  test('should call light client warning for 3+ light clients', async () => {
    (useNetworkContext as jest.Mock).mockImplementation(() => ({
      connectToNetwork: jest.fn(),
      connections: {
        '0x123': { connection: { connectionType: ConnectionType.LIGHT_CLIENT } },
        '0x456': { connection: { connectionType: ConnectionType.LIGHT_CLIENT } },
        '0x789': { connection: { connectionType: ConnectionType.LIGHT_CLIENT } },
      },
    }));

    const props = { ...defaultNetwork, connection: { ...defaultNetwork.connection, canUseLightClient: true } };
    render(<ConnectionSelector networkItem={props} />);

    const button = screen.getByRole('button');
    await act(async () => button.click());

    const lightClientBtn = screen.getByText('networkManagement.lightClientLabel');
    await act(async () => lightClientBtn.click());

    expect(confirmSpy).toBeCalled();
  });

  test('should reconnect after edit custom node', async () => {
    const user = userEvent.setup();
    const spyDisconnect = jest.fn();

    (CustomRpcModal as jest.Mock).mockImplementation(({ onClose }: any) => (
      <button type="button" onClick={() => onClose({ name: 'edit_node', url: 'edit_url' })}>
        editCustomRpc
      </button>
    ));

    render(<ConnectionSelector networkItem={{ ...withCustomActiveNetwork, disconnect: spyDisconnect }} />);

    const selectorBtn = screen.getByRole('button', { name: /My custom node/ });
    await act(async () => selectorBtn.click());

    const row = screen.getByText('wss://westend-rpc.polkadot.io');
    await user.hover(row);

    const editNode = screen.getByRole('button', { name: 'edit-outline.svg' });
    await act(async () => editNode.click());

    const rpcCloseBtn = screen.getByRole('button', { name: 'editCustomRpc' });
    act(() => rpcCloseBtn.click());

    expect(spyDisconnect).toBeCalled();
  });
});
