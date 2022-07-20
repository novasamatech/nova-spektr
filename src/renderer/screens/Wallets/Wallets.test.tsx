import { render, screen } from '@testing-library/react';

import Wallets from './Wallets';

describe('screen/Wallets', () => {
  test('should render component', () => {
    render(<Wallets />);

    const text = screen.getByText('Wallets');
    expect(text).toBeInTheDocument();
  });
});
