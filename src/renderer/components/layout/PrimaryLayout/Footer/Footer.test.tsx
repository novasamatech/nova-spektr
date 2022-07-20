import { render, screen } from '@testing-library/react';

import { Footer } from './Footer';

describe('layout/PrimaryLayout/Footer', () => {
  test('should render component', () => {
    render(<Footer />);

    const text = screen.getByText('1');
    expect(text).toBeInTheDocument();
  });
});
