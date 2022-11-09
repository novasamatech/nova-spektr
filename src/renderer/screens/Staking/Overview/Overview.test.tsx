import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import { Chain } from '@renderer/domain/chain';
import Overview from './Overview';

jest.mock('@renderer/services/network/chainsService', () => ({
  useChains: jest.fn().mockReturnValue({
    getChainsData: jest.fn().mockReturnValue([
      {
        addressPrefix: 0,
        assets: [],
        chainId: '0x00',
        name: 'My test chain',
      },
    ]),
    sortChains: (value: Chain[]) => value,
  }),
}));

jest.mock('@renderer/services/wallet/walletService', () => ({
  useWallet: jest.fn().mockReturnValue({
    getActiveWallets: () => [
      {
        name: 'Test Wallet',
        mainAccounts: [{ address: '1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ', publicKey: TEST_PUBLIC_KEY }],
      },
    ],
  }),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/Overview', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<Overview />, { wrapper: MemoryRouter });
    });

    const title = screen.getByText('staking.title');
    expect(title).toBeInTheDocument();
  });
});
