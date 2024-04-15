import { act, render, screen } from '@testing-library/react';
import noop from 'lodash/noop';

import { ConnectionStatus, ConnectionType } from '@shared/core';
import { ExtendedChain } from '@entities/network';
import { NetworkSelector } from './NetworkSelector';
import { useScrollTo } from '@shared/lib/hooks';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@shared/lib/hooks');

describe('pages/Settings/Networks/NetworkSelector', () => {
  beforeAll(() => {
    (useScrollTo as jest.Mock).mockReturnValue([{ current: {} }, noop]);
  });

  const defaultNetwork: ExtendedChain = {
    addressPrefix: 0,
    specName: 'my_chain',
    assets: [],
    chainId: '0x123',
    icon: '',
    name: '',
    nodes: [
      { url: 'wss://westend-rpc.polkadot.io', name: 'Parity node' },
      { url: 'wss://westend.api.onfinality.io/public-ws', name: 'OnFinality node' },
    ],
    connectionStatus: ConnectionStatus.DISCONNECTED,
    connection: {
      id: 0,
      chainId: '0x123',
      canUseLightClient: false,
      connectionType: ConnectionType.DISABLED,
      customNodes: [],
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
    connectionStatus: ConnectionStatus.CONNECTED,
    connection: {
      ...defaultNetwork.connection,
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

  const defaultProps = {
    networkItem: defaultNetwork,
    onDisconnect: noop,
    onConnect: noop,
    onEditRpcNetworkChange: noop,
    openEditRpcModal: noop,
    openAddRpcModal: noop,
    onRemoveCustomNode: noop,
    onAddRpcNetworkChange: noop,
    onSelectNode: noop,
  };

  test('should render component', () => {
    render(<NetworkSelector {...defaultProps} />);

    const text = screen.getByText('settings.networks.selectorDisableNode');
    expect(text).toBeInTheDocument();
  });

  test('should render list of nodes', async () => {
    render(<NetworkSelector {...defaultProps} networkItem={lightClientNetworks} />);

    const button = screen.getByRole('button');
    await act(async () => button.click());

    const nodes = screen.getAllByRole('option');
    expect(nodes).toHaveLength(6);
  });

  test('should not show light client option', async () => {
    render(<NetworkSelector {...defaultProps} />);

    const button = screen.getByRole('button');
    await act(async () => button.click());

    const lightClient = screen.queryByText('settings.networks.lightClientLabel');
    expect(lightClient).not.toBeInTheDocument();
  });

  test('should call edit and delete for custom node', async () => {
    const removeSpy = jest.fn();
    render(<NetworkSelector {...defaultProps} networkItem={withCustomNetwork} onRemoveNode={removeSpy} />);

    const selectorBtn = screen.getByRole('button');
    await act(async () => selectorBtn.click());

    const edit = screen.getByRole('button', { name: 'edit.svg' });
    await act(async () => edit.click());

    const remove = screen.getByRole('button', { name: 'delete.svg' });
    await act(async () => remove.click());
    expect(removeSpy).toHaveBeenCalled();
  });
});
