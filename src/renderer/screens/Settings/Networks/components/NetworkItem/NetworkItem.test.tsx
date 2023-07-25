import { render, screen } from '@testing-library/react';
import noop from 'lodash/noop';

import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import { ExtendedChain } from '@renderer/entities/network';
import { NetworkItem } from './NetworkItem';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('../NetworkSelector/NetworkSelector', () => ({
  NetworkSelector: () => 'selector',
}));

describe('screen/Settings/Networks/NetworkItem', () => {
  const defaultProps = {
    networkItem: {
      icon: 'wnd.svg',
      name: 'Westend',
      connection: {
        connectionType: ConnectionType.RPC_NODE,
        connectionStatus: ConnectionStatus.CONNECTED,
        activeNode: { name: 'Active node', url: 'wss://test.com' },
      },
    } as unknown as ExtendedChain,
    onDisconnect: noop,
    onConnect: noop,
    onRemoveCustomNode: noop,
    onChangeCustomNode: noop,
  };

  test('should render component', () => {
    render(<NetworkItem {...defaultProps} />);

    const networkName = screen.getByText(defaultProps.networkItem.name);
    const networkIcons = screen.getAllByRole('img');
    const connectionStatus = screen.getByText(defaultProps.networkItem.connection.activeNode?.url || '');
    expect(networkName).toBeInTheDocument();
    expect(networkIcons[0]).toBeInTheDocument();
    expect(networkIcons[0]).toHaveAttribute('src', defaultProps.networkItem.icon);
    expect(connectionStatus).toBeInTheDocument();
  });
});
