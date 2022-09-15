import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { ConnectionStatus, ConnectionType } from '@renderer/domain/connection';
import Networks from './Networks';

jest.mock('../NetworkList/NetworkList', () => () => 'networkList');

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

describe('screen/Overview/Networks', () => {
  test('should render component', () => {
    render(<Networks />, { wrapper: MemoryRouter });

    const text = screen.getByText('Networks');
    expect(text).toBeInTheDocument();
  });

  test('should render no results', async () => {
    const user = userEvent.setup();
    render(<Networks />, { wrapper: MemoryRouter });

    const input = screen.getByRole('textbox');
    await user.type(input, 'xxx');

    const noResults = screen.getByText('No networks with the entered name were found');
    expect(noResults).toBeInTheDocument();
  });
});
