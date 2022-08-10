import { render, screen } from '@testing-library/react';

import Balances from './Balances';

jest.mock('@renderer/context/NetworkContext', () => ({
  useNetworkContext: jest.fn().mockReturnValue({
    connections: {
      '0x0000000000000000000000000000000000000000': {
        chainId: '1',
        assets: [
          {
            assetId: '1',
            symbol: '1',
          },
          { assetId: '2', symbol: '2' },
        ],
      },
      '0x0000000000000000000000000000000000000001': {
        chainId: '2',
        assets: [
          {
            assetId: '1',
            symbol: '1',
          },
        ],
      },
    },
  }),
}));

// TODO: Find way to avoid warnings with this mock
jest.mock('./Balance', () => () => <div>Balance</div>);

describe('screen/Balances', () => {
  test('should render component', () => {
    render(<Balances />);
    const text = screen.getByText('Balances');

    expect(text).toBeInTheDocument();
  });

  test('should render chains', () => {
    render(<Balances />);
    const chains = screen.getAllByText('Token');

    expect(chains.length).toEqual(2);
  });

  test('should render balances', () => {
    render(<Balances />);

    const balances = screen.getAllByText('Balance');

    expect(balances.length).toEqual(3);
  });
});
