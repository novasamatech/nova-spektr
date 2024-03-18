import { act, render, screen } from '@testing-library/react';
import { fork, allSettled } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter } from 'react-router-dom';

import { ConnectionStatus, ConnectionType } from '@shared/core';
import { ExtendedChain, networkModel } from '@entities/network';
import { Networks } from './Networks';

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
  NetworkSelector: () => <div>NetworkSelector</div>,
  EditCustomRpcModal: ({ onClose }: any) => (
    <button type="button" onClick={() => onClose({ name: 'edit_node', url: 'wss://edit_url.com' })}>
      editCustomRpc
    </button>
  ),
  AddCustomRpcModal: ({ onClose }: any) => (
    <button type="button" onClick={() => onClose({ name: 'edit_node', url: 'wss://edit_url.com' })}>
      addCustomRpc
    </button>
  ),
}));

jest.mock('@features/network', () => ({
  ...jest.requireActual('@features/network'),
  NetworkList: ({ networkList, children }: any) => (
    <ul>
      {networkList.map((n: ExtendedChain) => (
        <li key={n.name}>{children(n)}</li>
      ))}
    </ul>
  ),
  ActiveNetwork: ({ children }: any) => (
    <div>
      <span>ActiveNetwork</span>
      {children}
    </div>
  ),
  InactiveNetwork: () => <span>InactiveNetwork</span>,
  EmptyNetworks: () => <span>EmptyNetworks</span>,
  NetworksFilter: () => <div>NetworksFilter</div>,
}));

describe('pages/Settings/Networks', () => {
  const renderNetworks = async () => {
    const scope = fork({
      values: new Map()
        .set(networkModel.$connections, {
          [chains[0].chainId]: { connectionType: ConnectionType.DISABLED },
          [chains[1].chainId]: { connectionType: ConnectionType.AUTO_BALANCE },
          [chains[2].chainId]: { connectionType: ConnectionType.RPC_NODE },
          [chains[3].chainId]: { connectionType: ConnectionType.LIGHT_CLIENT },
        })
        .set(networkModel.$connectionStatuses, {
          [chains[0].chainId]: ConnectionStatus.DISCONNECTED,
          [chains[1].chainId]: ConnectionStatus.CONNECTING,
          [chains[2].chainId]: ConnectionStatus.CONNECTED,
          [chains[3].chainId]: ConnectionStatus.ERROR,
        }),
    });

    await allSettled(networkModel.$chains, {
      scope,
      params: {
        [chains[0].chainId]: chains[0],
        [chains[1].chainId]: chains[1],
        [chains[2].chainId]: chains[2],
        [chains[3].chainId]: chains[3],
      },
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
    const networkLists = screen.getAllByRole('list');
    const networksFilter = screen.getByText('NetworksFilter');
    const activeItem = screen.getAllByText('ActiveNetwork');
    const inactiveItem = screen.getByText('InactiveNetwork');
    const emptyNetworks = screen.getByText('EmptyNetworks');
    const networkSelector = screen.getAllByText('NetworkSelector');

    expect(text).toBeInTheDocument();
    expect(networksFilter).toBeInTheDocument();
    expect(networkLists).toHaveLength(2);
    expect(activeItem).toHaveLength(3);
    expect(inactiveItem).toBeInTheDocument();
    expect(emptyNetworks).toBeInTheDocument();
    expect(networkSelector).toHaveLength(3);
  });
});
