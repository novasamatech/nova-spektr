import { act, render, screen } from '@testing-library/react';

import { Chain } from '@renderer/services/network/common/types';
import StepThree from './StepThree';

jest.mock('@renderer/services/wallet/walletService', () => ({
  useWallet: jest.fn().mockReturnValue({
    setActiveWallets: jest.fn(),
  }),
}));

jest.mock('@renderer/services/network/chainsService', () => ({
  useChains: jest.fn().mockReturnValue({
    getChainsData: jest.fn().mockReturnValue([]),
    sortChains: (value: Array<Chain>) => value,
  }),
}));

// TODO: add more tests
describe('screens/Onboard/Parity/StepThree', () => {
  test('should render component', async () => {
    await act(async () => {
      render(
        <StepThree
          ss58Address="1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ"
          onNextStep={() => {}}
          onPrevStep={() => {}}
        />,
      );
    });

    const title = screen.getByRole('heading', { name: 'Please choose a name for your wallet' });
    expect(title).toBeInTheDocument();
  });
});
