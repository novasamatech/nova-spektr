import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/entities/asset';
import { SigningType, ChainType, CryptoType } from '@renderer/domain/shared-kernel';
import { Account } from '@renderer/entities/account';
import AccountsModal from './AccountsModal';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock(
  '@renderer/components/common/AddressWithExplorers/AddressWithExplorers',
  jest.fn().mockReturnValue(({ address }: { address: string }) => <span data-testid="account">{address}</span>),
);

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
    expect(title).toBeInTheDocument();
  });

  test('should render all accounts', () => {
    render(<AccountsModal {...defaultProps} />);

    const items = screen.getAllByTestId('account');
    expect(items).toHaveLength(defaultProps.accounts.length);
  });
});
