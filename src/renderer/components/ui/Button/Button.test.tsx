import { render, screen } from '@testing-library/react';

import Button from './Button';

describe('Button', () => {
  test('should render component', () => {
    render(
      <Button variant="fill" pallet="error">
        Hello button
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Hello button' });
    expect(button).toBeInTheDocument();
  });
});
