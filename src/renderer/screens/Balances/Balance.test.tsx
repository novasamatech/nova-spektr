import { render, screen } from '@testing-library/react';

import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import Balance from './Balance';
import chains from '@renderer/services/network/common/chains.json';
import { Chain } from '@renderer/services/network/common/types';

const testChain = chains[0] as Chain;
const testAsset = testChain.assets[0];

jest.mock('@renderer/services/balance/balanceService', () => ({
  useBalance: jest.fn().mockReturnValue({
    getBalance: jest.fn().mockReturnValue({
      free: 100,
      frozen: 10,
    }),
  }),
}));

describe('screen/Balance', () => {
  test('should render component', () => {
    render(<Balance asset={testAsset} chain={testChain} publicKey={TEST_PUBLIC_KEY} />);
    const text = screen.getByTestId('balance');

    expect(text).toHaveTextContent('0.000000009 DOT');
  });
});

export {};
