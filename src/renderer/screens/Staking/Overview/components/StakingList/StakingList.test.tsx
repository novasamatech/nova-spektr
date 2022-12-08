import { render, screen } from '@testing-library/react';

import StakingList from './StakingList';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('pages/Staking/Overview/StakingList', () => {
  test('should create component', () => {
    render(<StakingList />);

    const text = screen.getByText('staking.overview.stakingAssetLabel');
    expect(text).toBeInTheDocument();
  });
});
