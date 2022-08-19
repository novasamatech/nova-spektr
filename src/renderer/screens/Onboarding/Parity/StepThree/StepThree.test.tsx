import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import StepThree from './StepThree';
import { TEST_PUBLIC_KEY } from '@renderer/services/balance/common/constants';

jest.mock('@renderer/services/wallet/walletService', () => ({
  useWallet: jest.fn().mockReturnValue({
    getActiveWallets: () => [
      {
        name: 'Test Wallet',
        mainAccounts: [
          {
            address: '1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ',
            publicKey: TEST_PUBLIC_KEY,
          },
        ],
      },
    ],
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
        { wrapper: MemoryRouter },
      );
    });

    const title = screen.getByRole('heading', { name: 'Please choose a name for your wallet' });
    expect(title).toBeInTheDocument();
  });
});
