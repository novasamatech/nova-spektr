import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Credentials from './Credentials';

describe('screen/Overview/Credentials', () => {
  test('should render component', () => {
    render(<Credentials />, { wrapper: MemoryRouter });

    const text = screen.getByText('Matrix Credentials');
    expect(text).toBeInTheDocument();
  });
});
