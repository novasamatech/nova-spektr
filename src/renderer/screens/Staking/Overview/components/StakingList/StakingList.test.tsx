import { render, screen } from '@testing-library/react';

import StakingList from './StakingList';
import noop from 'lodash/noop';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/Overview/StakingList', () => {
  test('should create component', () => {
    render(<StakingList stakeInfo={[]} onCheckValidators={noop} />);

    const accountHeader = screen.getByText('staking.overview.accountTableHeader');
    const stakeHeader = screen.getByText('staking.overview.stakeTableHeader');
    const rewardsHeader = screen.getByText('staking.overview.rewardsTableHeader');
    expect(accountHeader).toBeInTheDocument();
    expect(stakeHeader).toBeInTheDocument();
    expect(rewardsHeader).toBeInTheDocument();
  });
});
