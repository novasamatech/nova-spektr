import { render, screen } from '@testing-library/react';

import NoAccounts from './NoAccounts';

jest.mock('react-i18next', () => ({ Trans: (props: any) => props.i18nKey }));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/Overview/NoAccounts', () => {
  test('should render component', () => {
    render(<NoAccounts chainName="Westend" />);

    const label = screen.getByText('staking.overview.noAccountsLabel');
    const description = screen.getByText('staking.overview.noAccountsDescription');
    expect(label).toBeInTheDocument();
    expect(description).toBeInTheDocument();
  });
});
