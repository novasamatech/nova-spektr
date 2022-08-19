import { render, screen } from '@testing-library/react';

import FinalStep from './FinalStep';
import { WalletType } from '@renderer/domain/wallet';

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

// TODO: add more tests
describe('screens/Onboard/FinalStep', () => {
  test('should render Watch Only component', () => {
    render(<FinalStep walletType={WalletType.WATCH_ONLY} />);

    const title = screen.getByText('Your wallet is ready to use!');
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
