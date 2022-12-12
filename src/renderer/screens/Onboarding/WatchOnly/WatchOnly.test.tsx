import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import WatchOnly from './WatchOnly';
import { TEST_ADDRESS, TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';
import { Chain } from '@renderer/domain/chain';

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    getActiveAccounts: () => [
      {
        name: 'Test Wallet',
        accountId: TEST_ADDRESS,
        publicKey: TEST_PUBLIC_KEY,
      },
    ],
  }),
}));

jest.mock('@renderer/services/network/chainsService', () => ({
  useChains: jest.fn().mockReturnValue({
    getChainsData: jest.fn().mockReturnValue([]),
    sortChains: (value: Chain[]) => value,
  }),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Onboarding/WatchOnly', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<WatchOnly />, { wrapper: MemoryRouter });
    });

    const title = screen.getByRole('heading', { name: 'onboarding.watchonly.addWatchOnlyLabel' });
    expect(title).toBeInTheDocument();
  });
});
