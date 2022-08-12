import { act, render } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';

import Paths from '@renderer/routes/paths';
import { useWallet } from '@renderer/services/wallet/walletService';
import Onboarding from './Onboarding';

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  Outlet: () => 'outlet',
}));
jest.mock('@renderer/services/wallet/walletService', () => ({
  useWallet: jest.fn(),
}));

describe('Onboarding', () => {
  // test('should render component', async () => {
  //   const spyNavigate = jest.fn();
  //
  //   (useNavigate as jest.Mock).mockImplementation(spyNavigate);
  //
  //   (useWallet as jest.Mock).mockImplementation(() => ({
  //     getWallets: jest.fn().mockResolvedValue([1, 2, 3]),
  //   }));
  //
  //   await act(async () => {
  //     render(<Onboarding />, { wrapper: MemoryRouter });
  //   });
  //
  //   // const langSwitch = screen.getByRole('button', { name: 'Switch language' });
  //   expect(spyNavigate).toBeCalledWith(Paths.BALANCES);
  // });

  test('should navigate to Balances', async () => {
    const spyNavigate = jest.fn();

    (useNavigate as jest.Mock).mockReturnValue(spyNavigate);

    (useWallet as jest.Mock).mockImplementation(() => ({
      getWallets: jest.fn().mockResolvedValue([1, 2, 3]),
    }));

    await act(async () => {
      render(<Onboarding />, { wrapper: MemoryRouter });
    });

    expect(spyNavigate).toBeCalledWith(Paths.BALANCES, { replace: true });
  });

  // test('should navigate to Balances', async () => {
  //   (useWallet as jest.Mock).mockReturnValue({
  //     getWallets: jest.fn().mockReturnValue([1, 2, 3]),
  //   });
  //
  //   await act(async () => {
  //     render(<Onboarding />, { wrapper: MemoryRouter });
  //   });
  //
  //   const langSwitch = screen.getByRole('button', { name: 'Switch language' });
  //   expect(langSwitch).toBeInTheDocument();
  // });
  //
  // test('should render SplashScreen', async () => {
  //   (useWallet as jest.Mock).mockReturnValue({
  //     getWallets: jest.fn().mockReturnValue([1, 2, 3]),
  //   });
  //
  //   await act(async () => {
  //     render(<Onboarding />, { wrapper: MemoryRouter });
  //   });
  //
  //   const langSwitch = screen.getByRole('button', { name: 'Switch language' });
  //   expect(langSwitch).toBeInTheDocument();
  // });
});
