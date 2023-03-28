import { render, screen } from '@testing-library/react';

import PasswordInput from './PasswordInput';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('ui/Inputs/PasswordInput', () => {
  test('should render password visibility button', async () => {
    render(<PasswordInput />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});
