import { render, screen } from '@testing-library/react';

import FinalStep from './FinalStep';
import { WalletType } from '@renderer/domain/wallet';

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

// TODO: add more tests
describe('screens/Onboard/FinalStep', () => {
  test('should render Watch Only component', () => {
    render(<FinalStep walletType={WalletType.WATCH_ONLY} />);

    const title = screen.getByText('onboarding.readyToUseLabel');
    expect(title).toBeInTheDocument();
  });

  // test('should render Parity component', async () => {
  //   await act(async () => {
  //     render(<FinalStep walletType={WalletType.PARITY} />);
  //   });
  //
  //   const title = screen.getByRole('heading', { name: 'Please choose a name for your wallet' });
  //   expect(title).toBeInTheDocument();
  // });
});
