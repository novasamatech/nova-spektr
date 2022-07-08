import { render, screen } from '@testing-library/react';

import Switch from '../Switch';

describe('Switch', () => {
  test('should render component', () => {
    render(<Switch label="test label" />);

    const label = screen.getByText('test label');
    expect(label).toBeInTheDocument();
  });
});
