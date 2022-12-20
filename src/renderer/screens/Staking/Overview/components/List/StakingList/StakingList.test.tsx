import { render, screen } from '@testing-library/react';

import { StakingMap } from '@renderer/services/staking/common/types';
import { AccountDS, WalletDS } from '@renderer/services/storage';
import { Asset } from '@renderer/domain/asset';
import { TEST_ADDRESS } from '@renderer/services/balance/common/constants';
import StakingList from './StakingList';

jest.mock('../StakingListItem/StakingListItem', () => () => 'stakingListItem');

jest.mock('@renderer/services/staking/stakingRewardsService', () => ({
  useStakingRewards: jest.fn().mockReturnValue({
    rewards: {},
    isLoading: false,
  }),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/Overview/StakingList', () => {
  test('should create component', () => {
    const accounts = [{ accountId: TEST_ADDRESS }] as unknown as AccountDS[];
    const asset = { symbol: 'DOT', precision: 10 } as Asset;
    const staking = { [TEST_ADDRESS]: { accountId: TEST_ADDRESS } } as unknown as StakingMap;

    render(<StakingList accounts={accounts} wallets={[] as WalletDS[]} staking={staking} asset={asset} />);

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
