import { act, render, screen, waitFor } from '@testing-library/react';

import { ConnectionStatus, ConnectionType } from '@shared/core';
import { ExtendedChain } from '@entities/network';
import { NetworkList } from './NetworkList';

describe('pages/Settings/Networks/NetworkList', () => {
  const children = () => 'children';
  const networks: ExtendedChain[] = [
    {
      addressPrefix: 0,
      assets: [],
      explorers: [],
      name: 'My test chain',
      specName: 'my_test_chain',
      nodes: [],
      chainId: '0x123',
      icon: 'test_icon.svg',
      connectionStatus: ConnectionStatus.CONNECTED,
      connection: {
        id: 1,
        chainId: '0x123',
        connectionType: ConnectionType.RPC_NODE,
        activeNode: { name: 'test node', url: 'wss://test.com' },
        customNodes: [],
      },
    },
  ];

  test('should render component', () => {
    render(
      <NetworkList isDefaultOpen title="Test list" networkList={networks}>
        {children}
      </NetworkList>,
    );

    const text = screen.getByText('Test list');
    expect(text).toBeInTheDocument();
  });

  test('should render collapsed list by default', async () => {
    render(
      <NetworkList title="Test list" networkList={networks}>
        {children}
      </NetworkList>,
    );

    const hiddenChildren = screen.queryByText('children');
    expect(hiddenChildren).not.toBeInTheDocument();

    const button = screen.getByRole('button');
    await act(() => button.click());

    const visibleChildren = screen.getByText('children');
    expect(visibleChildren).toBeInTheDocument();
  });

  test('should render open list with active search query', async () => {
    const { rerender } = render(
      <NetworkList title="Test list" networkList={networks}>
        {children}
      </NetworkList>,
    );

    const hiddenChildren = screen.queryByText('children');
    expect(hiddenChildren).not.toBeInTheDocument();

    rerender(
      <NetworkList query="My test chain" title="Test list" networkList={networks}>
        {children}
      </NetworkList>,
    );

    waitFor(() => {
      const visibleChildren = screen.getByText('children');
      expect(visibleChildren).toBeInTheDocument();
    });
  });
});
