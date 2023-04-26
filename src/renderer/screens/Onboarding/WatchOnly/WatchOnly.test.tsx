import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import WatchOnly from './WatchOnly';
import { Chain } from '@renderer/domain/chain';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    addAccount: jest.fn(),
  }),
}));

jest.mock('@renderer/services/network/chainsService', () => ({
  useChains: jest.fn().mockReturnValue({
    getChainsData: jest.fn().mockResolvedValue([]),
    sortChains: jest.fn((value: Chain[]) => value),
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
