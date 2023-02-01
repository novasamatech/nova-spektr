import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import InitBond from './InitBond';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getLiveAccounts: () => [
      {
        name: 'Test Wallet',
        accountId: '1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ',
        publicKey: TEST_PUBLIC_KEY,
      },
    ],
  }),
}));

jest.mock('@renderer/services/balance/balanceService', () => ({
  useBalance: jest.fn().mockReturnValue({
    getBalance: jest.fn().mockReturnValue({
      assetId: 1,
      chainId: '0x123',
      publicKey: TEST_PUBLIC_KEY,
      free: '10',
      frozen: [{ type: 'test', amount: '1' }],
    }),
    getLiveAssetBalances: jest.fn().mockReturnValue([
      {
        assetId: 1,
        chainId: '0x123',
        publicKey: TEST_PUBLIC_KEY,
        free: '10',
        frozen: [{ type: 'test', amount: '1' }],
      },
    ]),
  }),
}));

describe('screens/Bond/InitBond', () => {
  test('should render loading', () => {
    render(<InitBond accountIds={[]} onResult={() => {}} />, { wrapper: MemoryRouter });

    const loading = screen.getByText('LOADING');
    expect(loading).toBeInTheDocument();
  });
});
