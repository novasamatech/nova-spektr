import { act, render, screen } from '@testing-library/react';
import noop from 'lodash/noop';

import { ConnectionType } from '@shared/core';
import { ConnectionOptions } from '@entities/network';
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

  const defaultNetwork: ConnectionOptions = {
    availableNodes: [{ type: ConnectionType.AUTO_BALANCE }, { type: ConnectionType.DISABLED }],
    selectedNode: { type: ConnectionType.DISABLED },
    isCustomNode: jest.fn().mockReturnValue(false),
  };

  const lightClientNetworks: ConnectionOptions = {
    ...defaultNetwork,
    availableNodes: [
      { type: ConnectionType.AUTO_BALANCE },
      { type: ConnectionType.DISABLED },
      { type: ConnectionType.RPC_NODE, node: { url: 'wss://rpc.matrix.blockchain.enjin.io', name: 'Enjin node' } },
      { type: ConnectionType.RPC_NODE, node: { url: 'wss://westend-rpc.polkadot.io', name: 'Parity node' } },
      { type: ConnectionType.LIGHT_CLIENT },
    ],
  };

  const connectedNetwork: ConnectionOptions = {
    ...defaultNetwork,
    activeNode: { url: 'wss://westend-rpc.polkadot.io', name: 'Parity node' },
  };

  const withCustomNetwork: ConnectionOptions = {
    ...connectedNetwork,
    availableNodes: [
      { type: ConnectionType.AUTO_BALANCE },
      { type: ConnectionType.DISABLED },
      { type: ConnectionType.RPC_NODE, node: { url: 'wss://rpc.matrix.blockchain.enjin.io', name: 'Enjin node' } },
    ],
    isCustomNode: jest.fn().mockReturnValue(true),
  };

  const defaultProps = {
    networkItem: defaultNetwork,
    onDisconnect: noop,
    onConnect: noop,
    onRemoveCustomNode: noop,
    onChangeCustomNode: noop,
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
    const changeSpy = jest.fn();
    const removeSpy = jest.fn();
    render(
      <NetworkSelector
        {...defaultProps}
        networkItem={withCustomNetwork}
        onChangeCustomNode={changeSpy}
        onRemoveCustomNode={removeSpy}
      />,
    );

    const selectorBtn = screen.getByRole('button');
    await act(async () => selectorBtn.click());

    const edit = screen.getByRole('button', { name: 'edit.svg' });
    await act(async () => edit.click());
    expect(changeSpy).toHaveBeenCalled();

    const remove = screen.getByRole('button', { name: 'delete.svg' });
    await act(async () => remove.click());
    expect(removeSpy).toHaveBeenCalled();
  });
});
