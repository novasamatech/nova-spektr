import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import WatchOnly from './WatchOnly';

describe('screens/Onboarding/WatchOnly', () => {
  test('should render component', () => {
    render(<WatchOnly />, { wrapper: MemoryRouter });

    const title = screen.getByRole('heading', { name: 'Add watch-only Wallet' });
    expect(title).toBeInTheDocument();
  });
});
