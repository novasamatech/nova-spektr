import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import InitBond from './InitBond';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Bond/Bond', () => {
  test('should render component', () => {
    render(<InitBond />, { wrapper: MemoryRouter });

    const title = screen.getByText('staking.title');
    const subTitle = screen.getByText('staking.startStaking.subtitle');
    expect(title).toBeInTheDocument();
    expect(subTitle).toBeInTheDocument();
  });
});
