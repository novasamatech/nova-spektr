import { render, screen } from '@testing-library/react';

import NoAccounts from './NoAccounts';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/Overview/NoAccounts', () => {
  test('should render component', () => {
    render(<NoAccounts />);

    const label = screen.getByText('staking.overview.noAccountsLabel');
    expect(label).toBeInTheDocument();
  });
});
