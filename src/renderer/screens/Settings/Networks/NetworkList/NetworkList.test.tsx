import { act, render, screen } from '@testing-library/react';

import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ExtendedChain } from '@renderer/services/network/common/types';
import NetworkList from './NetworkList';

jest.mock('../NetworkItem/NetworkItem', () => () => 'networkItem');

describe('screen/Settings/NetworkList', () => {
  const networks: ExtendedChain[] = [
    {
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
    },
  ];

  test('should render component', () => {
    render(
      <NetworkList title="Test list" networkList={networks}>
        children
      </NetworkList>,
    );

    const text = screen.getByText('Test list');
    expect(text).toBeInTheDocument();
  });

  test('should render collapsed list by default', async () => {
    render(
      <NetworkList title="Test list" networkList={networks}>
        children
      </NetworkList>,
    );

    const hiddenNetworkItem = screen.queryByText('networkItem');
    expect(hiddenNetworkItem).not.toBeInTheDocument();

    const button = screen.getByRole('button');
    await act(() => button.click());

    const visibleNetworkItem = screen.getByText('networkItem');
    expect(visibleNetworkItem).toBeInTheDocument();
  });

  test('should render open list with active search query', async () => {
    const { rerender } = render(
      <NetworkList title="Test list" networkList={networks}>
        children
      </NetworkList>,
    );

    const hiddenNetworkItemBefore = screen.queryByText('networkItem');
    expect(hiddenNetworkItemBefore).not.toBeInTheDocument();

    rerender(
      <NetworkList query="My test chain" title="Test list" networkList={networks}>
        children
      </NetworkList>,
    );

    const hiddenNetworkItemAfter = screen.getByText('networkItem');
    expect(hiddenNetworkItemAfter).toBeInTheDocument();
  });
});
