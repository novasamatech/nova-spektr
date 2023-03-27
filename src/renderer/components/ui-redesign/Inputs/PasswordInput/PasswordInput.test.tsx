import { render, screen } from '@testing-library/react';

import PasswordInput from './PasswordInput';

describe('ui/Inputs/PasswordInput', () => {
  test('should render password visibility button', async () => {
    render(<PasswordInput />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});
