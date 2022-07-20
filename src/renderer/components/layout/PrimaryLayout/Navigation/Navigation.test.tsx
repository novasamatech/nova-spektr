import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Navigation } from './Navigation';

describe('layout/PrimaryLayout/Navigation', () => {
  test('should render component', () => {
    render(<Navigation />, { wrapper: MemoryRouter });

    const text = screen.getByText('$1,148.14');
    expect(text).toBeInTheDocument();
  });
});
