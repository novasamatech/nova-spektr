import { act, render, screen } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';

import { matrixModel } from '@entities/matrix';

import { UserInfo } from './UserInfo';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('pages/Settings/Matrix/UserInfo', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    render(<UserInfo />);

    const title = screen.getByText('settings.matrix.userIdLabel');
    expect(title).toBeInTheDocument();
  });

  test('should logout from Matrix', async () => {
    const spyLogout = jest.fn();
    const scope = fork({
      values: new Map().set(matrixModel.$matrix, { logout: spyLogout }),
    });

    render(
      <Provider value={scope}>
        <UserInfo />
      </Provider>,
    );

    const button = screen.getByRole('button');
    await act(async () => button.click());

    expect(spyLogout).toHaveBeenCalled();
  });
});
