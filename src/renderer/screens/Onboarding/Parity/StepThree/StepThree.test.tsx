import { act, render, screen } from '@testing-library/react';

import { Chain } from '@renderer/domain/chain';
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
    const address = screen.getByDisplayValue('1ChFWeNRLa...Wz7jX7iTVZ');
    expect(title).toBeInTheDocument();
    expect(address).toBeInTheDocument();
  });

  test('should not submit form without name', async () => {
    const spyNextStep = jest.fn();

    await act(async () => {
      render(
        <StepThree
          ss58Address="1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ"
          onNextStep={spyNextStep}
          onPrevStep={() => {}}
        />,
      );
    });

    const button = screen.getByRole('button', { name: 'Type a name to finish...' });
    button.click();

    expect(spyNextStep).not.toBeCalled();
  });

  test('should go to scan page', async () => {
    const spyPrevStep = jest.fn();

    await act(async () => {
      render(
        <StepThree
          ss58Address="1ChFWeNRLarAPRCTM3bfJmncJbSAbSS9yqjueWz7jX7iTVZ"
          onNextStep={() => {}}
          onPrevStep={spyPrevStep}
        />,
      );
    });

    const button = screen.getByRole('button', { name: 'Rescan QR code' });
    button.click();

    expect(spyPrevStep).toBeCalled();
  });
});
