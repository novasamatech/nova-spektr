import { act, render, screen } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter } from 'react-router-dom';

import { ConnectionStatus, ConnectionType } from '@shared/core';
import { ExtendedChain, networkModel } from '@entities/network';
import { Networks } from './Networks';
import { networksFilterModel } from '@features/network';

const confirmSpy = jest.fn();

const chains = [
  { name: 'Westmint', chainId: '0x111' },
  { name: 'Westend', chainId: '0x222' },
  { name: 'Kusama', chainId: '0x333' },
  { name: 'Polkadot', chainId: '0x444' },
];

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
  useConfirmContext: jest.fn(() => ({
    confirm: confirmSpy,
  })),
}));

jest.mock('./components', () => ({
  CustomRpcModal: ({ onClose }: any) => (
    <button type="button" onClick={() => onClose({ name: 'edit_node', url: 'wss://edit_url.com' })}>
      editCustomRpc
    </button>
  ),
}));

jest.mock('@features/network', () => ({
  ...jest.requireActual('@features/network'),
  NetworksFilter: () => <div>filter</div>,
  NetworksList: ({ networkList, children }: any) => (
    <ul>
      {networkList.map((n: ExtendedChain) => (
        <li key={n.name}>{children(n)}</li>
      ))}
    </ul>
  ),
  ActiveNetwork: ({ networkItem, children }: any) => (
    <div>
      <span>{networkItem.name}</span>
      {children}
    </div>
  ),
  InactiveNetwork: ({ networkItem, children }: any) => (
    <div>
      <span>{networkItem.name}</span>
      {children}
    </div>
  ),
}));

describe('pages/Settings/Networks', () => {
  const renderNetworks = async () => {
    const scope = fork({
      values: new Map()
        .set(networksFilterModel.$filterQuery, '')
        .set(networkModel.$chains, {
          [chains[0].chainId]: chains[0],
          [chains[1].chainId]: chains[1],
          [chains[2].chainId]: chains[2],
          [chains[3].chainId]: chains[3],
        })
        .set(networkModel.$connections, {
          [chains[0].chainId]: { connectionType: ConnectionType.DISABLED },
          [chains[1].chainId]: { connectionType: ConnectionType.AUTO_BALANCE },
          [chains[2].chainId]: { connectionType: ConnectionType.RPC_NODE },
          [chains[3].chainId]: { connectionType: ConnectionType.LIGHT_CLIENT },
        })
        .set(networkModel.$connectionStatuses, {
          [chains[0].chainId]: ConnectionStatus.DISCONNECTED,
          [chains[1].chainId]: ConnectionStatus.CONNECTED,
          [chains[2].chainId]: ConnectionStatus.DISCONNECTED,
          [chains[3].chainId]: ConnectionStatus.DISCONNECTED,
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

  // test('should render no results', async () => {
  //   await renderNetworks();

  //   let noResults = screen.queryByText('settings.networks.emptyStateLabel');
  //   expect(noResults).not.toBeInTheDocument();

  //   await renderNetworks('xxx');

  //   noResults = screen.getByText('settings.networks.emptyStateLabel');
  //   expect(noResults).toBeInTheDocument();
  // });

  // test('should render filtered network', async () => {
  //   await renderNetworks('west');

  //   const polkadotItem = screen.queryByText('Polkadot');
  //   expect(polkadotItem).not.toBeInTheDocument();

  //   const items = screen.getAllByRole('listitem');

  //   ['Westmint', 'Westend'].forEach((title, index) => {
  //     expect(items[index]).toHaveTextContent(title);
  //   });
  // });

  // test('should correctly sort different status network', async () => {
  //   await renderNetworks();

  //   const items = screen.getAllByRole('listitem');
  //   ['Westmint', 'Polkadot', 'Kusama', 'Westend'].forEach((title, index) => {
  //     expect(items[index]).toHaveTextContent(title);
  //   });
  // });

  // test('should show disconnect confirm modal', async () => {
  //   const scope = fork({
  //     values: new Map()
  //       .set(networkModel.$chains, {
  //         '0x111': {
  //           name: 'Kusama',
  //           chainId: '0x111',
  //         },
  //       })
  //       .set(networkModel.$connections, {
  //         '0x111': { connectionType: ConnectionType.RPC_NODE },
  //       })
  //       .set(networkModel.$connectionStatuses, { '0x111': ConnectionStatus.CONNECTED }),
  //   });

  //   await act(async () => {
  //     render(
  //       <Provider value={scope}>
  //         <Networks />
  //       </Provider>,
  //       { wrapper: MemoryRouter },
  //     );
  //   });

  //   const button = screen.getByRole('button', { name: 'disconnect' });
  //   await act(async () => button.click());

  //   expect(confirmSpy).toHaveBeenCalled();
  // });

  // test('should call light client warning for 3+ light clients', async () => {
  //   const scope = fork({
  //     values: new Map()
  //       .set(networkModel.$chains, {
  //         '0x001': {
  //           name: 'Polkadot',
  //           chainId: '0x001',
  //         },
  //         '0x002': { name: 'Kusama', chainId: '0x002' },
  //         '0x003': { name: 'Acala', chainId: '0x003' },
  //         '0x004': { name: 'Westend', chainId: '0x004' },
  //       })
  //       .set(networkModel.$connections, {
  //         '0x001': { connectionType: ConnectionType.LIGHT_CLIENT },
  //         '0x002': { connectionType: ConnectionType.LIGHT_CLIENT },
  //         '0x003': { connectionType: ConnectionType.LIGHT_CLIENT },
  //         '0x004': { connectionType: ConnectionType.RPC_NODE },
  //       })
  //       .set(networkModel.$connectionStatuses, {
  //         '0x001': ConnectionStatus.CONNECTED,
  //         '0x002': ConnectionStatus.CONNECTED,
  //         '0x003': ConnectionStatus.CONNECTED,
  //         '0x004': ConnectionStatus.CONNECTED,
  //       }),
  //   });

  //   await act(async () => {
  //     render(
  //       <Provider value={scope}>
  //         <Networks />
  //       </Provider>,
  //       { wrapper: MemoryRouter },
  //     );
  //   });

  //   const button = screen.getAllByRole('button', { name: 'connect' })[3];
  //   await act(async () => button.click());

  //   expect(confirmSpy).toHaveBeenCalled();
  // });
});
