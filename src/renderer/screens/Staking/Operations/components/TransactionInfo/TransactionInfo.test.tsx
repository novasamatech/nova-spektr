import { ApiPromise } from '@polkadot/api';
import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import { RewardsDestination } from '@renderer/domain/stake';
import { SigningType } from '@renderer/domain/shared-kernel';
import { AccountDS } from '@renderer/services/storage';
import { TEST_ADDRESS } from '@renderer/shared/utils/constants';
import TransactionInfo from './TransactionInfo';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/components/TransactionInfo', () => {
  const asset = { symbol: 'DOT', precision: 10 } as Asset;
  const destPayload = { address: TEST_ADDRESS, type: RewardsDestination.TRANSFERABLE };
  const accounts = [
    {
      accountId: TEST_ADDRESS,
      name: 'address_1',
      signingType: SigningType.WATCH_ONLY,
    },
    {
      accountId: TEST_ADDRESS,
      name: 'address_2',
      signingType: SigningType.PARITY_SIGNER,
    },
  ] as AccountDS[];

  test('should render component', () => {
    render(
      <TransactionInfo
        api={{} as ApiPromise}
        accounts={accounts}
        destination={destPayload}
        amount="123"
        validators={[]}
        addressPrefix={0}
        asset={asset}
        transactions={[]}
      >
        children
      </TransactionInfo>,
    );

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
