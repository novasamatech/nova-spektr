import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { GeneralActions } from './GeneralActions';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
  Paths: {
    NETWORK: '/settings/network',
    REFERENDUM_DATA: '/settings/referendum',
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
    expect(links[1]).toHaveAttribute('href', '/settings/referendum');
    expect(links[2]).toHaveAttribute('href', '/settings/currency');
  });
});
