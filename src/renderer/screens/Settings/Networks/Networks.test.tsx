import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import Networks from './Networks';

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0x123': {
        chainId: '1',
        name: 'Westmint',
        connection: {
          chainId: '0x123',
          connectionType: ConnectionType.DISABLED,
          connectionStatus: ConnectionStatus.NONE,
          customNodes: [],
        },
      },
    },
  })),
}));

describe('screen/Overview/Credentials', () => {
  test('should render component', () => {
    render(<Networks />, { wrapper: MemoryRouter });

    const text = screen.getByText('Networks');
    expect(text).toBeInTheDocument();
  });
});
