import { render, screen, act } from '@testing-library/react';

import { Credentials } from '../Credentials';
import { useMatrix } from '@app/providers';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
  useMatrix: jest.fn().mockReturnValue({
    matrix: { logout: jest.fn() },
  }),
}));

describe('pages/Settings/Matrix/Credentials', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    render(<Credentials />);

    const title = screen.getByText('settings.matrix.userIdLabel');
    expect(title).toBeInTheDocument();
  });

  test('should logout from Matrix', async () => {
    const spyLogout = jest.fn();
    (useMatrix as jest.Mock).mockReturnValue({
      matrix: { logout: spyLogout },
    });
    render(<Credentials />);

    const button = screen.getByRole('button');
    await act(async () => button.click());

    expect(spyLogout).toBeCalled();
  });
});
