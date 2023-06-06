import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { MatrixAction } from './MatrixAction';
import Paths from '@renderer/routes/paths';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screen/Settings/Overview/MatrixAction', () => {
  test('should render label and link to SMP', () => {
    render(<MatrixAction />, { wrapper: MemoryRouter });

    const label = screen.getByText('settings.overview.smpLabel');
    const link = screen.getByRole('link');
    expect(label).toBeInTheDocument();
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', `/${Paths.MATRIX}`);
  });
});
