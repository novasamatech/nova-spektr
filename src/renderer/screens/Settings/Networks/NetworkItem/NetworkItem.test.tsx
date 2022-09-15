import { render, screen } from '@testing-library/react';

import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ExtendedChain } from '@renderer/services/network/common/types';
import NetworkItem from './NetworkItem';

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connectToNetwork: jest.fn(),
  })),
}));

describe('screen/Settings/NetworkItem', () => {
  const network: ExtendedChain = {
    addressPrefix: 0,
    assets: [],
    explorers: [],
    name: 'My test chain',
    nodes: [],
    chainId: '0x123',
    icon: 'test_icon.svg',
    connection: {
      chainId: '0x123',
      connectionType: ConnectionType.RPC_NODE,
      connectionStatus: ConnectionStatus.CONNECTED,
      activeNode: { name: 'test node', url: 'wss://test.com' },
    },
  };

  test('should render component', () => {
    render(<NetworkItem networkItem={network} />);

    const networkName = screen.getByText(network.name);
    const networkIcons = screen.getAllByRole('img');
    const connectionStatus = screen.getByText(network.connection.activeNode?.url || '');
    expect(networkName).toBeInTheDocument();
    expect(networkIcons[0]).toBeInTheDocument();
    expect(networkIcons[0]).toHaveAttribute('src', network.icon);
    expect(connectionStatus).toBeInTheDocument();
  });
});
