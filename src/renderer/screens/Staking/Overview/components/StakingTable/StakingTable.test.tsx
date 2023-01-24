import { render, screen } from '@testing-library/react';

import StakingTable from './StakingTable';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/Overview/StakingTable', () => {
  test('should create component', () => {
    render(<StakingTable stakeInfo={[]} selectedStakes={[]} openValidators={() => {}} selectStaking={() => {}} />);

    const account = screen.getByText('staking.overview.accountTableHeader');
    const rewards = screen.getByText('staking.overview.rewardsTableHeader');
    const stake = screen.getByText('staking.overview.stakeTableHeader');
    expect(account).toBeInTheDocument();
    expect(rewards).toBeInTheDocument();
    expect(stake).toBeInTheDocument();
  });
});
