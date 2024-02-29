import { render, screen } from '@testing-library/react';

import type { Asset, BaseAccount, ChainId } from '@shared/core';
import { ChainType, CryptoType, AccountType } from '@shared/core';
import AccountsModal from './AccountsModal';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@entities/asset', () => ({
  useBalance: jest.fn().mockReturnValue({
    getLiveAssetBalances: jest.fn().mockReturnValue([]),
  }),
  AssetBalance: ({ value }: any) => <div>{value}</div>,
}));

jest.mock('@entities/balance', () => ({
  useAssetBalances: jest.fn().mockReturnValue([]),
}));

describe('pages/Staking/components/AccountsModal', () => {
  const defaultProps = {
    isOpen: true,
    amounts: ['1000000000000', '2000000000000', '3000000000000'],
    asset: { symbol: 'DOT', precision: 10, assetId: 123 } as Asset,
    chainId: '0xEGSgCCMmg5vePv611bmJpgdy7CaXaHayqPH8XwgD1jetWjN' as ChainId,
    accounts: [
      {
        id: 1,
        type: AccountType.BASE,
        walletId: 1,
        accountId: '0x12QkLhnKL5vXsa7e74CC45RUSqA5fRqc8rKHzXYZb82ppZap',
        name: 'address_1',
        chainType: ChainType.SUBSTRATE,
        cryptoType: CryptoType.SR25519,
      },
      {
        id: 2,
        type: AccountType.BASE,
        walletId: 1,
        accountId: '0xEGSgCCMmg5vePv611bmJpgdy7CaXaHayqPH8XwgD1jetWjN',
        name: 'address_2',
        chainType: ChainType.SUBSTRATE,
        cryptoType: CryptoType.SR25519,
      },
      {
        id: 3,
        type: AccountType.BASE,
        walletId: 1,
        accountId: '0x5H46Nxu6sJvTYe4rSUxYTUU6pG5dh6jZq66je2g7SLE3RCj6',
        name: 'address_3',
        chainType: ChainType.SUBSTRATE,
        cryptoType: CryptoType.SR25519,
      },
    ] as BaseAccount[],
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
