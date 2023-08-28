import { render, screen, act } from '@testing-library/react';

import { InputPassword } from './InputPassword';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('ui/Inputs/InputPassword', () => {
  test('should render password visibility button', () => {
    render(<InputPassword />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  test('should change input type', async () => {
    render(<InputPassword />);

    let input = screen.queryByRole('textbox');
    expect(input).not.toBeInTheDocument();
    expect(screen.getByTestId('hide-svg')).toBeInTheDocument();

    const button = screen.getByRole('button');
    await act(() => button.click());

    input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();

    expect(screen.queryByTestId('hide-svg')).not.toBeInTheDocument();
    expect(screen.getByTestId('show-svg')).toBeInTheDocument();
  });
});
