import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { GeneralActions } from './GeneralActions';
import { Paths } from '@renderer/app/providers';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screen/Settings/Overview/GeneralActions', () => {
  test('should render label and link to network', () => {
    render(<GeneralActions />, { wrapper: MemoryRouter });

    const label = screen.getByText('settings.overview.generalLabel');
    const link = screen.getByRole('link');
    expect(label).toBeInTheDocument();
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', Paths.NETWORK);
  });
});
