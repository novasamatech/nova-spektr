import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Parity from './Parity';

describe('screens/Onboarding/Parity', () => {
  test('should render component', () => {
    render(<Parity />, { wrapper: MemoryRouter });

    const title = screen.getByRole('heading', { name: 'Add wallet by Parity Signer' });
    expect(title).toBeInTheDocument();
  });
});
