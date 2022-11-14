import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Unbond from './Unbond';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/Validators', () => {
  test('should render component', () => {
    render(<Unbond />, { wrapper: MemoryRouter });

    const title = screen.getByText('staking.title');
    const subTitle = screen.getByText('staking.unbond.subtitle');
    expect(title).toBeInTheDocument();
    expect(subTitle).toBeInTheDocument();
  });
});
