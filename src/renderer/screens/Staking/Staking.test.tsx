import { render, screen } from '@testing-library/react';

import { ConnectionType } from '@renderer/domain/connection';
import Staking from './Staking';

jest.mock('@apollo/client', () => ({
  useQuery: jest.fn().mockReturnValue({ data: 1 }),
  gql: jest.fn(),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn(() => ({
    connections: {
      '0x123': {
        chainId: '1',
        assets: [
          { assetId: '1', symbol: '1' },
          { assetId: '2', symbol: '2' },
        ],
        connection: {
          connectionType: ConnectionType.RPC_NODE,
        },
      },
    },
  })),
}));

describe('Staking', () => {
  test('should render component', () => {
    render(<Staking />);

    const text = screen.getByText('staking.title');
    expect(text).toBeInTheDocument();
  });
});
