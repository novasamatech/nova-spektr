import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import ButtonReturn from './ButtonReturn';

describe('ui/Buttons/ButtonReturn', () => {
  test('should render component', () => {
    render(<ButtonReturn />, { wrapper: MemoryRouter });

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});
