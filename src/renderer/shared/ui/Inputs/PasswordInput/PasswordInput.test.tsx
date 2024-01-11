import { render, screen, act } from '@testing-library/react';

import { PasswordInput } from './PasswordInput';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('ui/Inputs/PasswordInput', () => {
  test('should render password visibility button', () => {
    render(<PasswordInput />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  test('should change input type', async () => {
    render(<PasswordInput />);

    let input = screen.queryByRole('textbox');
    let eyeIcon = screen.getByText('eye-slashed.svg');
    expect(input).not.toBeInTheDocument();
    expect(eyeIcon).toBeInTheDocument();

    const button = screen.getByRole('button');
    await act(() => button.click());

    input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();

    expect(eyeIcon).not.toBeInTheDocument();
    eyeIcon = screen.getByText('eye.svg');
    expect(eyeIcon).toBeInTheDocument();
  });
});
