import { render, screen } from '@testing-library/react';

import StakingList from './StakingList';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/Overview/StakingList', () => {
  test('should create component', () => {
    render(
      <StakingList allSelected onSelectAll={() => {}}>
        children
      </StakingList>,
    );

    const account = screen.getByText('staking.overview.accountTableHeader');
    const rewards = screen.getByText('staking.overview.rewardsTableHeader');
    const stake = screen.getByText('staking.overview.stakeTableHeader');
    const child = screen.getByText('children');
    expect(account).toBeInTheDocument();
    expect(rewards).toBeInTheDocument();
    expect(stake).toBeInTheDocument();
    expect(child).toBeInTheDocument();
  });
});
