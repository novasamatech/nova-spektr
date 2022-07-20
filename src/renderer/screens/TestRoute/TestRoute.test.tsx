import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import TestRoute from './TestRoute';

describe('TestRoute', () => {
  test('should render component', () => {
    render(<TestRoute />, { wrapper: MemoryRouter });

    const button = screen.getByText('Test route');
    expect(button).toBeInTheDocument();
  });
});
