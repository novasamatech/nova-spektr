import { render, screen } from '@testing-library/react';

import { Icon } from './Icon';

describe('components/primitives/Icon', () => {
  test('should render svg component', () => {
    render(<Icon name="novawallet" />);

    const label = screen.getByTestId('novawallet-svg');
    expect(label).toBeInTheDocument();
  });

  test('should render img component', () => {
    render(<Icon as="img" name="novawallet" />);

    const label = screen.getByTestId('novawallet-img');
    expect(label).toBeInTheDocument();
  });
});
