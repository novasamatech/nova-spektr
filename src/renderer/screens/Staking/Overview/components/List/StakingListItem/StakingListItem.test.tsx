import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import { SigningType } from '@renderer/domain/shared-kernel';
import { TEST_ADDRESS } from '@renderer/services/balance/common/constants';
import StakingListItem from './StakingListItem';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/Overview/StakingListItem', () => {
  const asset = { symbol: 'DOT', precision: 10 } as Asset;
  const stakeInfo = {
    address: TEST_ADDRESS,
    signingType: SigningType.PARITY_SIGNER,
    accountName: 'Account name',
    walletName: 'Wallet name - Root name',
    accountIsSelected: false,
    totalReward: '100',
    totalStake: '200',
  };

  test('should render component', () => {
    render(
      <StakingListItem
        stakeInfo={stakeInfo}
        asset={asset}
        addressPrefix={0}
        explorers={[]}
        onOpenValidators={() => {}}
        onSelect={() => {}}
      />,
    );

    const accountName = screen.getByText(stakeInfo.accountName);
    const subName = screen.getByText(stakeInfo.walletName);
    const amounts = screen.getAllByText('assetBalance.number');
    expect(accountName).toBeInTheDocument();
    expect(subName).toBeInTheDocument();
    expect(amounts).toHaveLength(2);
  });

  test('should render loading state', () => {
    render(<StakingListItem stakeInfo={stakeInfo} onSelect={() => {}} onOpenValidators={() => {}} />);

    const amounts = screen.queryByText('assetBalance.number');
    expect(amounts).not.toBeInTheDocument();
  });
});
