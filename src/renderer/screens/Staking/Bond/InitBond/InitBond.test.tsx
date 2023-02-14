import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import { TEST_PUBLIC_KEY } from '@renderer/shared/utils/constants';
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
        id: '1',
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
  const asset = { assetId: 1, symbol: 'DOT', precision: 10 } as Asset;

  test('should render component', () => {
    render(<InitBond chainId="0x123" accountIds={['1']} asset={asset} onResult={() => {}} />);

    const input = screen.getByPlaceholderText('staking.bond.amountPlaceholder');
    const destination = screen.getByText('staking.bond.rewardsDestinationTitle');
    const button = screen.getByText('staking.bond.continueButton');
    expect(input).toBeInTheDocument();
    expect(destination).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });
});
