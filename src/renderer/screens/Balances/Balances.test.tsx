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
          },
          { assetId: '2' },
        ],
      },
      '0x0000000000000000000000000000000000000001': {
        chainId: '2',
        assets: [
          {
            assetId: '1',
          },
        ],
      },
    },
  }),
}));

// TODO: Find way to avoid warnings with this mock
jest.mock('./Balance', () => 'Balance');

describe('screen/Balances', () => {
  test('should render component', () => {
    render(<Balances />);
    const text = screen.getByText('Balances');

    expect(text).toBeInTheDocument();
  });

  test('should render chains', () => {
    render(<Balances />);
    const text = screen.getAllByText('Token');

    expect(text.length).toEqual(2);
  });

  test('should render balances', () => {
    render(<Balances />);
    const text = screen.queryAllByText((_, element) => element?.tagName.toLowerCase() === 'balance');

    expect(text.length).toEqual(3);
  });
});

export {};
