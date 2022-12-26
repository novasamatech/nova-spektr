import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import { SigningType } from '@renderer/domain/shared-kernel';
import StakingList from './StakingList';

jest.mock('../StakingListItem/StakingListItem', () => () => 'stakingListItem');

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/Overview/StakingList', () => {
  test('should create component', () => {
    const asset = { symbol: 'DOT', precision: 10 } as Asset;
    const staking = [
      {
        accountName: 'test_ROOT',
        address: '133khBTmxKsWJ6kyybChNadTHyy1kDmpStWNCiEiSdDMAZwS',
        isSelected: false,
        signingType: SigningType.PARITY_SIGNER,
        totalReward: undefined,
        totalStake: '5757762883235',
        walletName: 'Secure_Wallet',
      },
    ];

    render(
      <StakingList allAccountsSelected staking={staking} asset={asset} onSelect={() => {}} onSelectAll={() => {}} />,
    );

    const account = screen.getByText('staking.overview.accountTableHeader');
    const rewards = screen.getByText('staking.overview.rewardsTableHeader');
    const stake = screen.getByText('staking.overview.stakeTableHeader');
    const item = screen.getByRole('listitem');
    expect(account).toBeInTheDocument();
    expect(rewards).toBeInTheDocument();
    expect(stake).toBeInTheDocument();
    expect(item).toBeInTheDocument();
  });
});
