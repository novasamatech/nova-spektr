import { render, screen } from '@testing-library/react';

import Transfer from './Transfer';

describe('Transfer', () => {
  test('should render component', () => {
    render(<Transfer />);

    const text = screen.getByText('Transfer');
    expect(text).toBeInTheDocument();
  });
});
