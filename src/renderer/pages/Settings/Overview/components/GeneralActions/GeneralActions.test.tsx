import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { GeneralActions } from './GeneralActions';
import { Paths } from '../../../../../app/providers/routes/paths';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('pages/Settings/Overview/GeneralActions', () => {
  test('should render label and link to network', () => {
    render(<GeneralActions />, { wrapper: MemoryRouter });

    const label = screen.getByText('settings.overview.generalLabel');
    const link = screen.getAllByRole('link')[0];
    expect(label).toBeInTheDocument();
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', Paths.NETWORK);
  });
});
