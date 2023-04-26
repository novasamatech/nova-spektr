import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import { SigningType, ChainType, CryptoType } from '@renderer/domain/shared-kernel';
import AccountsModal from './AccountsModal';
import { Account } from '@renderer/domain/account';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/components/AccountsModal', () => {
  const defaultProps = {
    isOpen: true,
    amounts: ['1000000000000', '2000000000000', '3000000000000'],
    asset: { symbol: 'DOT', precision: 10 } as Asset,
    accounts: [
      {
        accountId: '0x12QkLhnKL5vXsa7e74CC45RUSqA5fRqc8rKHzXYZb82ppZap',
        name: 'address_1',
        signingType: SigningType.WATCH_ONLY,
        chainType: ChainType.SUBSTRATE,
        cryptoType: CryptoType.SR25519,
        isMain: false,
        isActive: false,
      },
      {
        accountId: '0xEGSgCCMmg5vePv611bmJpgdy7CaXaHayqPH8XwgD1jetWjN',
        name: 'address_2',
        signingType: SigningType.PARITY_SIGNER,
        chainType: ChainType.SUBSTRATE,
        cryptoType: CryptoType.SR25519,
        isMain: false,
        isActive: false,
      },
      {
        accountId: '0x5H46Nxu6sJvTYe4rSUxYTUU6pG5dh6jZq66je2g7SLE3RCj6',
        name: 'address_3',
        signingType: SigningType.PARITY_SIGNER,
        chainType: ChainType.SUBSTRATE,
        cryptoType: CryptoType.SR25519,
        isMain: false,
        isActive: false,
      },
    ] as Account[],
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
