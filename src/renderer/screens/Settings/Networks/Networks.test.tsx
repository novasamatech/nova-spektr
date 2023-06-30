import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import Networks from './Networks';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { useNetworkContext } from '@renderer/context/NetworkContext';

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

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0x111': {
        name: 'Westmint',
        connection: { connectionType: ConnectionType.DISABLED, connectionStatus: ConnectionStatus.NONE },
      },
      '0x222': {
        name: 'Westend',
        options: ['testnet'],
        connection: { connectionType: ConnectionType.AUTO_BALANCE, connectionStatus: ConnectionStatus.CONNECTED },
      },
      '0x333': {
        name: 'Kusama',
        connection: { connectionType: ConnectionType.RPC_NODE, connectionStatus: ConnectionStatus.ERROR },
      },
      '0x444': {
        name: 'Polkadot',
        connection: { connectionType: ConnectionType.LIGHT_CLIENT, connectionStatus: ConnectionStatus.CONNECTING },
      },
    },
    connectToNetwork: jest.fn(),
    connectWithAutoBalance: jest.fn(),
    removeRpcNode: jest.fn(),
    getParachains: jest.fn().mockReturnValue([]),
  })),
}));

jest.mock('@renderer/services/balance/balanceService', () => ({
  useBalance: jest.fn().mockReturnValue({
    setBalanceIsValid: jest.fn(),
  }),
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getAccounts: jest.fn().mockReturnValue([]),
  }),
}));

const nodeToEdit = { name: 'edit_node', url: 'wss://edit_url.com' };
jest.mock('./components', () => ({
  NetworkList: ({ networkList, children }: any) => (
    <ul>
      {networkList.map((n: ExtendedChain) => (
        <li key={n.name}>{children(n)}</li>
      ))}
    </ul>
  ),
  NetworkItem: ({ networkItem, onConnect, onDisconnect, onRemoveCustomNode, onChangeCustomNode }: any) => (
    <div>
      <span>{networkItem.name}</span>
      <button type="button" onClick={() => onConnect(ConnectionType.LIGHT_CLIENT)}>
        connect
      </button>
      <button type="button" onClick={onDisconnect}>
        disconnect
      </button>
      <button type="button" onClick={onRemoveCustomNode}>
        remove
      </button>
      <button type="button" onClick={() => onChangeCustomNode(nodeToEdit)}>
        change
      </button>
    </div>
  ),
  CustomRpcModal: ({ onClose }: any) => (
    <button type="button" onClick={() => onClose(nodeToEdit)}>
      editCustomRpc
    </button>
  ),
}));

describe('screen/Settings/Networks', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<Networks />, { wrapper: MemoryRouter });
    });

    const text = screen.getByText('settings.networks.title');
    const list = screen.getAllByRole('list');
    expect(text).toBeInTheDocument();
    expect(list).toHaveLength(2);
  });

  test('should render no results', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<Networks />, { wrapper: MemoryRouter });
    });

    let noResults = screen.queryByText('settings.networks.emptyStateLabel');
    expect(noResults).not.toBeInTheDocument();

    const input = screen.getByRole('textbox');
    await user.type(input, 'xxx');

    noResults = screen.getByText('settings.networks.emptyStateLabel');
    expect(noResults).toBeInTheDocument();
  });

  test('should render filtered networks', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Networks />, { wrapper: MemoryRouter });

    const input = screen.getByRole('textbox');
    await user.type(input, 'west');

    const polkadotItem = screen.queryByText('Polkadot');
    expect(polkadotItem).not.toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    ['Westmint', 'Westend'].forEach((title, index) => {
      expect(items[index]).toHaveTextContent(title);
    });
  });

  test('should correctly sort different status networks', async () => {
    await act(async () => {
      render(<Networks />, { wrapper: MemoryRouter });
    });

    const items = screen.getAllByRole('listitem');
    ['Westmint', 'Polkadot', 'Kusama', 'Westend'].forEach((title, index) => {
      expect(items[index]).toHaveTextContent(title);
    });
  });

  test('should show disconnect confirm modal', async () => {
    (useNetworkContext as jest.Mock).mockImplementation(() => ({
      connectToNetwork: jest.fn(),
      connections: {
        '0x111': {
          name: 'Kusama',
          connection: { connectionType: ConnectionType.RPC_NODE, connectionStatus: ConnectionStatus.ERROR },
        },
      },
    }));

    await act(async () => {
      render(<Networks />, { wrapper: MemoryRouter });
    });

    const button = screen.getByRole('button', { name: 'disconnect' });
    await act(async () => button.click());

    expect(confirmSpy).toBeCalled();
  });

  test('should call light client warning for 3+ light clients', async () => {
    (useNetworkContext as jest.Mock).mockImplementation(() => ({
      connections: {
        '0x001': { name: 'Polkadot', connection: { connectionType: ConnectionType.LIGHT_CLIENT } },
        '0x002': { name: 'Kusama', connection: { connectionType: ConnectionType.LIGHT_CLIENT } },
        '0x003': { name: 'Acala', connection: { connectionType: ConnectionType.LIGHT_CLIENT } },
        '0x004': { name: 'Westend', connection: { connectionType: ConnectionType.RPC_NODE } },
      },
    }));

    await act(async () => {
      render(<Networks />, { wrapper: MemoryRouter });
    });

    const button = screen.getAllByRole('button', { name: 'connect' })[3];
    await act(async () => button.click());

    expect(confirmSpy).toBeCalled();
  });

  test('should reconnect after edit custom node', async () => {
    const spyConnect = jest.fn();
    (useNetworkContext as jest.Mock).mockImplementation(() => ({
      connectToNetwork: spyConnect,
      connections: {
        '0x001': {
          name: 'Polkadot',
          connection: { connectionType: ConnectionType.RPC_NODE, activeNode: nodeToEdit },
        },
      },
    }));

    await act(async () => {
      render(<Networks />, { wrapper: MemoryRouter });
    });

    const changeButton = screen.getByRole('button', { name: 'change' });
    await act(async () => changeButton.click());

    const editButton = screen.getByRole('button', { name: 'editCustomRpc', hidden: true });
    await act(async () => editButton.click());

    expect(spyConnect).toBeCalled();
  });
});
