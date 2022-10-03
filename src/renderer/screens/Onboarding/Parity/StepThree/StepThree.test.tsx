import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Chain } from '@renderer/domain/chain';
import StepThree from './StepThree';

jest.mock('@renderer/services/wallet/walletService', () => ({
  useWallet: jest.fn().mockReturnValue({
    addWallet: jest.fn(),
    setActiveWallet: jest.fn(),
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

describe('screens/Onboard/Parity/StepThree', () => {
  const ss58Address = 'HHGHYqbanKiynHB8MCPjwUDwNgVpHtFTViH2NSse3FNrHnF';

  test('should render component', async () => {
    await act(async () => {
      render(<StepThree ss58Address={ss58Address} onNextStep={() => {}} onPrevStep={() => {}} />);
    });

    const title = screen.getByRole('heading', { name: 'onboarding.paritysigner.choseWalletNameLabel' });
    const address = screen.getByDisplayValue('HHGHYqbanK...Sse3FNrHnF');
    expect(title).toBeInTheDocument();
    expect(address).toBeInTheDocument();
  });

  test('should submit form', async () => {
    const user = userEvent.setup();
    const spyNextStep = jest.fn();

    await act(async () => {
      render(<StepThree ss58Address={ss58Address} onNextStep={spyNextStep} onPrevStep={() => {}} />);
    });

    const name = screen.getByPlaceholderText('onboarding.walletNamePlaceholder');
    await act(async () => await user.type(name, 'test_wallet'));

    const button = screen.getByRole('button', { name: 'onboarding.confirmAccountsListButton' });
    await act(async () => button.click());

    expect(spyNextStep).toBeCalled();
  });

  test('should not submit form without name', async () => {
    const spyNextStep = jest.fn();

    await act(async () => {
      render(<StepThree ss58Address={ss58Address} onNextStep={spyNextStep} onPrevStep={() => {}} />);
    });

    const button = screen.getByRole('button', { name: 'onboarding.paritysigner.typeNameButton' });
    await act(async () => button.click());

    expect(spyNextStep).not.toBeCalled();
  });

  test('should go to scan page', async () => {
    const spyPrevStep = jest.fn();

    await act(async () => {
      render(<StepThree ss58Address={ss58Address} onNextStep={() => {}} onPrevStep={spyPrevStep} />);
    });

    const button = screen.getByRole('button', { name: 'onboarding.paritysigner.rescanQRButton' });
    await act(async () => button.click());

    expect(spyPrevStep).toBeCalled();
  });
});
