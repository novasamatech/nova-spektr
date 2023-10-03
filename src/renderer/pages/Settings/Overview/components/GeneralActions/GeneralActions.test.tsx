import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { GeneralActions } from './GeneralActions';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
  Paths: {
    NETWORK: '/settings/network',
    CURRENCY: '/settings/currency',
  },
}));

describe('screens/Settings/Overview/GeneralActions', () => {
  test('should render label and link to network and currency', () => {
    render(<GeneralActions />, { wrapper: MemoryRouter });

    const label = screen.getByText('settings.overview.generalLabel');
    const links = screen.getAllByRole('link');
    expect(label).toBeInTheDocument();

    expect(links[0]).toHaveAttribute('href', '/settings/network');
    expect(links[1]).toHaveAttribute('href', '/settings/currency');
  });
});
