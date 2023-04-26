import { ApiPromise } from '@polkadot/api';
import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import { SigningType, ChainType, CryptoType } from '@renderer/domain/shared-kernel';
import { RewardsDestination } from '@renderer/domain/stake';
import { Transaction } from '@renderer/domain/transaction';
import { TEST_ADDRESS } from '@renderer/shared/utils/constants';
import TransactionInfo from './TransactionInfo';
import { Account } from '@renderer/domain/account';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/components/TransactionInfo', () => {
  const defaultProps = {
    api: {} as ApiPromise,
    singleAccount: false,
    amount: '123',
    asset: { symbol: 'DOT', precision: 10 } as Asset,
    addressPrefix: 0,
    transaction: {} as Transaction,
    destination: { address: TEST_ADDRESS, type: RewardsDestination.TRANSFERABLE },
    accounts: [
      {
        accountId: '0x12QkLhnKL5vXsa7e74CC45RUSqA5fRqc8rKHzXYZb82ppZap',
        name: 'address_1',
        signingType: SigningType.PARITY_SIGNER,
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
    ] as Account[],
  };

  test('should render component', () => {
    render(<TransactionInfo {...defaultProps}>children</TransactionInfo>);

    const children = screen.getByText('children');
    const totalBalance = screen.getByText('staking.confirmation.totalAmount');
    const accs = screen.getByText('staking.confirmation.accounts');
    const fee = screen.getByText('staking.confirmation.networkFeePerAccount');
    const totalFee = screen.getByText('staking.confirmation.totalNetworkFee');
    expect(children).toBeInTheDocument();
    expect(totalBalance).toBeInTheDocument();
    expect(accs).toBeInTheDocument();
    expect(fee).toBeInTheDocument();
    expect(totalFee).toBeInTheDocument();
  });
});
