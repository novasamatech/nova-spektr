import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import { AccountDS } from '@renderer/services/storage';
import { SigningType } from '@renderer/domain/shared-kernel';
import AccountsModal from './AccountsModal';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

window.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

describe('screens/Bond/Confirmation/AccountsModal', () => {
  const defaultProps = {
    isOpen: true,
    amount: '1000000000000',
    asset: { symbol: 'DOT', precision: 10 } as Asset,
    accounts: [
      {
        accountId: '12QkLhnKL5vXsa7e74CC45RUSqA5fRqc8rKHzXYZb82ppZap',
        name: 'address_1',
        signingType: SigningType.WATCH_ONLY,
      },
      {
        accountId: 'EGSgCCMmg5vePv611bmJpgdy7CaXaHayqPH8XwgD1jetWjN',
        name: 'address_2',
        signingType: SigningType.PARITY_SIGNER,
      },
      {
        accountId: '5H46Nxu6sJvTYe4rSUxYTUU6pG5dh6jZq66je2g7SLE3RCj6',
        name: 'address_3',
        signingType: SigningType.PARITY_SIGNER,
      },
    ] as AccountDS[],
    onClose: () => {},
  };

  test('should render component', () => {
    render(<AccountsModal {...defaultProps} />);

    const title = screen.getByText('staking.confirmation.accountsTitle');
    const header = screen.queryByRole('rowheader');
    expect(title).toBeInTheDocument();
    expect(header).not.toBeInTheDocument();
  });

  test('should render all accounts', () => {
    render(<AccountsModal {...defaultProps} />);

    const items = screen.getAllByRole('row');
    const amounts = screen.getAllByText('assetBalance.number');
    expect(items).toHaveLength(4);
    expect(amounts).toHaveLength(3);
  });
});
