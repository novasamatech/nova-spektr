import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'effector-react';
import { fork } from 'effector';

import Networks from './Networks';
import { ConnectionStatus, ConnectionType } from '@shared/core';
import { ExtendedChain, networkModel } from '@entities/network';

const confirmSpy = jest.fn();

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
  useConfirmContext: jest.fn(() => ({
    confirm: confirmSpy,
  })),
}));

jest.mock('@entities/asset', () => ({
  useBalance: jest.fn().mockReturnValue({
    setBalanceIsValid: jest.fn(),
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

describe('pages/Settings/Networks', () => {
  const renderNetworks = async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, {
          '0x111': {
            name: 'Westmint',
            chainId: '0x111',
          },
          '0x222': {
            name: 'Westend',
            chainId: '0x222',
          },
          '0x333': {
            name: 'Kusama',
            chainId: '0x333',
          },
          '0x444': {
            name: 'Polkadot',
            chainId: '0x444',
          },
        })
        .set(networkModel.$connections, {
          '0x111': {
            connectionType: ConnectionType.DISABLED,
          },
          '0x222': {
            connectionType: ConnectionType.AUTO_BALANCE,
          },
          '0x333': {
            connectionType: ConnectionType.RPC_NODE,
          },
          '0x444': {
            connectionType: ConnectionType.LIGHT_CLIENT,
          },
        })
        .set(networkModel.$connectionStatuses, {
          '0x111': ConnectionStatus.DISCONNECTED,
          '0x222': ConnectionStatus.CONNECTED,
          '0x333': ConnectionStatus.DISCONNECTED,
          '0x444': ConnectionStatus.DISCONNECTED,
        }),
    });

    await act(async () => {
      render(
        <Provider value={scope}>
          <Networks />
        </Provider>,
        { wrapper: MemoryRouter },
      );
    });
  };

  test('should render component', async () => {
    await renderNetworks();

    const text = screen.getByText('settings.networks.title');
    const list = screen.getAllByRole('list');
    expect(text).toBeInTheDocument();
    expect(list).toHaveLength(2);
  });

  test('should render no results', async () => {
    const user = userEvent.setup();
    await renderNetworks();

    let noResults = screen.queryByText('settings.networks.emptyStateLabel');
    expect(noResults).not.toBeInTheDocument();

    const input = screen.getByRole('textbox');
    await user.type(input, 'xxx');

    noResults = screen.getByText('settings.networks.emptyStateLabel');
    expect(noResults).toBeInTheDocument();
  });

  test('should render filtered networks', async () => {
    const user = userEvent.setup({ delay: null });
    await renderNetworks();

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
    await renderNetworks();

    const items = screen.getAllByRole('listitem');
    ['Westmint', 'Polkadot', 'Kusama', 'Westend'].forEach((title, index) => {
      expect(items[index]).toHaveTextContent(title);
    });
  });

  test('should show disconnect confirm modal', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, {
          '0x111': {
            name: 'Kusama',
            chainId: '0x111',
          },
        })
        .set(networkModel.$connections, {
          '0x111': { connectionType: ConnectionType.RPC_NODE },
        })
        .set(networkModel.$connectionStatuses, { '0x111': ConnectionStatus.CONNECTED }),
    });

    await act(async () => {
      render(
        <Provider value={scope}>
          <Networks />
        </Provider>,
        { wrapper: MemoryRouter },
      );
    });

    const button = screen.getByRole('button', { name: 'disconnect' });
    await act(async () => button.click());

    expect(confirmSpy).toBeCalled();
  });

  test('should call light client warning for 3+ light clients', async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, {
          '0x001': {
            name: 'Polkadot',
            chainId: '0x001',
          },
          '0x002': { name: 'Kusama', chainId: '0x002' },
          '0x003': { name: 'Acala', chainId: '0x003' },
          '0x004': { name: 'Westend', chainId: '0x004' },
        })
        .set(networkModel.$connections, {
          '0x001': { connectionType: ConnectionType.LIGHT_CLIENT },
          '0x002': { connectionType: ConnectionType.LIGHT_CLIENT },
          '0x003': { connectionType: ConnectionType.LIGHT_CLIENT },
          '0x004': { connectionType: ConnectionType.RPC_NODE },
        })
        .set(networkModel.$connectionStatuses, {
          '0x001': ConnectionStatus.CONNECTED,
          '0x002': ConnectionStatus.CONNECTED,
          '0x003': ConnectionStatus.CONNECTED,
          '0x004': ConnectionStatus.CONNECTED,
        }),
    });

    await act(async () => {
      render(
        <Provider value={scope}>
          <Networks />
        </Provider>,
        { wrapper: MemoryRouter },
      );
    });

    const button = screen.getAllByRole('button', { name: 'connect' })[3];
    await act(async () => button.click());

    expect(confirmSpy).toBeCalled();
  });

  // TODO: Revert when custom nodes will be fixed
  // test.only('should reconnect after edit custom node', async () => {
  //   const spyConnect = jest.fn();

  //   const scope = fork({
  //     values: new Map()
  //       .set(networkModel.$chains, {
  //         '0x001': {
  //           name: 'Polkadot',
  //           chainId: '0x001',
  //         },
  //       })
  //       .set(networkModel.$connections, {
  //         '0x001': { connectionType: ConnectionType.RPC_NODE, activeNode: nodeToEdit },
  //       })
  //       .set(networkModel.$connectionStatuses, { '0x001': ConnectionStatus.CONNECTED }),
  //     handlers: new Map().set(networkModel.effects.updateConnectionFx, spyConnect),
  //   });

  //   await act(async () => {
  //     render(
  //       <Provider value={scope}>
  //         <Networks />
  //       </Provider>,
  //       { wrapper: MemoryRouter },
  //     );
  //   });

  //   const changeButton = screen.getByRole('button', { name: 'change' });
  //   await act(async () => changeButton.click());

  //   const editButton = screen.getByRole('button', { name: 'editCustomRpc', hidden: true });
  //   await act(async () => editButton.click());

  //   expect(spyConnect).toBeCalled();
  // });
});
