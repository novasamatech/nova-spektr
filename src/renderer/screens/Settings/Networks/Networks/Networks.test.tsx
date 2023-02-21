import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { useNetworkContext } from '@renderer/context/NetworkContext';
import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import Networks from './Networks';

jest.mock('../NetworkList/NetworkList', () => ({ networkList }: any) => (
  <ul>
    {networkList.map((network: any) => (
      <li key={network.name}>{network.name}</li>
    ))}
  </ul>
));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {},
  })),
}));

describe('screen/Settings/Networks', () => {
  test('should render component', () => {
    render(<Networks />, { wrapper: MemoryRouter });

    const text = screen.getByText('networkManagement.subTitle');
    expect(text).toBeInTheDocument();
  });

  test('should render no results', async () => {
    const user = userEvent.setup();
    render(<Networks />, { wrapper: MemoryRouter });

    const input = screen.getByRole('textbox');
    await user.type(input, 'xxx');

    const noResults = screen.getByText('networkManagement.emptyStateLabel');
    expect(noResults).toBeInTheDocument();
  });

  test('should render filtered networks', async () => {
    (useNetworkContext as jest.Mock).mockImplementation(() => ({
      connections: {
        '0x123': {
          name: 'Westmint',
          connection: { connectionType: ConnectionType.DISABLED },
        },
        '0x234': {
          name: 'Westend',
          connection: { connectionType: ConnectionType.DISABLED },
        },
        '0x345': {
          name: 'Polkadot',
          connection: { connectionType: ConnectionType.DISABLED },
        },
      },
    }));

    const user = userEvent.setup();
    render(<Networks />, { wrapper: MemoryRouter });

    const input = screen.getByRole('textbox');
    await user.type(input, 'west');

    const polkadotItem = screen.queryByText('Polkadot');
    const items = screen.getAllByRole('listitem');

    expect(polkadotItem).not.toBeInTheDocument();
    ['Westend', 'Westmint'].forEach((title, index) => {
      expect(items[index]).toHaveTextContent(title);
    });
  });

  test('should correctly sort different status networks', () => {
    (useNetworkContext as jest.Mock).mockImplementation(() => ({
      connections: {
        '0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9': {
          name: 'Westmint',
          connection: {
            chainId: '0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9',
            connectionStatus: ConnectionStatus.CONNECTED,
          },
        },
        '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a': {
          name: 'Kusama',
          connection: {
            chainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
            connectionStatus: ConnectionStatus.ERROR,
          },
        },
        '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': {
          name: 'Polkadot',
          connection: {
            chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
            connectionStatus: ConnectionStatus.CONNECTING,
          },
        },
      },
    }));

    render(<Networks />, { wrapper: MemoryRouter });

    const items = screen.getAllByRole('listitem');
    ['Kusama', 'Polkadot', 'Westmint'].forEach((title, index) => {
      expect(items[index]).toHaveTextContent(title);
    });
  });

  test('should correctly sort same status networks', () => {
    (useNetworkContext as jest.Mock).mockImplementation(() => ({
      connections: {
        '0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9': {
          name: 'Westmint',
          connection: {
            chainId: '0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9',
            connectionStatus: ConnectionStatus.CONNECTED,
          },
        },
        '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a': {
          name: 'Kusama',
          connection: {
            chainId: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
            connectionStatus: ConnectionStatus.CONNECTED,
          },
        },
        '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': {
          name: 'Polkadot',
          connection: {
            chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
            connectionStatus: ConnectionStatus.CONNECTED,
          },
        },
      },
    }));

    render(<Networks />, { wrapper: MemoryRouter });

    const items = screen.getAllByRole('listitem');
    ['Polkadot', 'Kusama', 'Westmint'].forEach((title, index) => {
      expect(items[index]).toHaveTextContent(title);
    });
  });
});
