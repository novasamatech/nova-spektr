import { render, screen } from '@testing-library/react';

import Icon from './Icon';

describe('ui/Icon', () => {
  test('should render svg component', () => {
    render(<Icon name="copy" />);

    const label = screen.getByTestId('copy-svg');
    expect(label).toBeInTheDocument();
  });

  test('should render img component', () => {
    render(<Icon as="img" name="copy" />);

    const label = screen.getByTestId('copy-img');
    expect(label).toBeInTheDocument();
  });
});
