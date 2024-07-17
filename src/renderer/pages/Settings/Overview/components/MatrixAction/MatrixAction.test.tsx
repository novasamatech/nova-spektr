import { render, screen } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { MemoryRouter } from 'react-router-dom';

import { Paths } from '@shared/routes';

import { LoginStatus, matrixModel } from '@entities/matrix';

import { MatrixAction } from './MatrixAction';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('pages/Settings/Overview/MatrixAction', () => {
  test('should render label and link to SMP', () => {
    const scope = fork({
      values: new Map()
        .set(matrixModel.$matrix, { userId: '@some_id:matrix.com' })
        .set(matrixModel.$loginStatus, LoginStatus.LOGGED_IN),
    });

    render(
      <Provider value={scope}>
        <MatrixAction />
      </Provider>,
      { wrapper: MemoryRouter },
    );

    const label = screen.getByText('settings.overview.smpLabel');
    const matrixId = screen.getByText('@some_id:matrix.com');
    const link = screen.getByRole('link');

    expect(label).toBeInTheDocument();
    expect(matrixId).toBeInTheDocument();
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', Paths.MATRIX);
  });
});
