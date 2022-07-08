import { render, screen } from '@testing-library/react';

import TestRoute from '../TestRoute';

describe('TestRoute', () => {
  test('should render component', () => {
    render(<TestRoute />);

    const button = screen.getByText('Test route');
    expect(button).toBeInTheDocument();
  });
});
