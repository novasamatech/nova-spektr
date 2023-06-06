import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Paths from '@renderer/routes/paths';
import InactiveChain from './InactiveChain';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/Overview/InactiveChain', () => {
  test('should render component', () => {
    render(<InactiveChain />, { wrapper: MemoryRouter });

    const label = screen.getByText('staking.overview.networkDisabledLabel');
    const description = screen.getByText('staking.overview.networkDisabledDescription');
    const link = screen.getByRole('link', { name: 'staking.overview.networkSettingsLink' });
    expect(label).toBeInTheDocument();
    expect(description).toBeInTheDocument();
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', `/${Paths.NETWORK}`);
  });
});
