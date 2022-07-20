import { render, screen } from '@testing-library/react';

import Balances from './Balances';

describe('screen/Balances', () => {
  test('should render component', () => {
    render(<Balances />);

    const text = screen.getByText('Balances');
    expect(text).toBeInTheDocument();
  });
});
