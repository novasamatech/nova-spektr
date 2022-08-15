import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import ButtonBack from './ButtonBack';

describe('ui/Buttons/ButtonBack', () => {
  test('should render component', () => {
    render(<ButtonBack />, { wrapper: MemoryRouter });

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});
