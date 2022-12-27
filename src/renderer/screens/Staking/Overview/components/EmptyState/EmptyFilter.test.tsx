import { render, screen } from '@testing-library/react';

import EmptyFilter from './EmptyFilter';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/Overview/EmptyFilter', () => {
  test('should render component', () => {
    render(<EmptyFilter />);

    const label = screen.getByText('staking.overview.emptyFilterLabel');
    const description = screen.getByText('staking.overview.emptyFilterDescription');
    expect(label).toBeInTheDocument();
    expect(description).toBeInTheDocument();
  });
});
