import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Networks from './Networks';

describe('screen/Overview/Credentials', () => {
  test('should render component', () => {
    render(<Networks />, { wrapper: MemoryRouter });

    const text = screen.getByText('Networks');
    expect(text).toBeInTheDocument();
  });
});
