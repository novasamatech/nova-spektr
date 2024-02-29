import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { MatrixAction } from './MatrixAction';
import { Paths } from '@shared/routes';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
  useMatrix: jest.fn().mockReturnValue({
    matrix: { userId: '@some_id:matrix.com' },
    isLoggedIn: true,
  }),
}));

describe('pages/Settings/Overview/MatrixAction', () => {
  test('should render label and link to SMP', () => {
    render(<MatrixAction />, { wrapper: MemoryRouter });

    const label = screen.getByText('settings.overview.smpLabel');
    const matrixId = screen.getByText('@some_id:matrix.com');
    const link = screen.getByRole('link');

    expect(label).toBeInTheDocument();
    expect(matrixId).toBeInTheDocument();
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', Paths.MATRIX);
  });
});
