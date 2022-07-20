import { render, screen } from '@testing-library/react';

import Operations from './Operations';

describe('Operations', () => {
  test('should render component', () => {
    render(<Operations />);

    const text = screen.getByText('Operations');
    expect(text).toBeInTheDocument();
  });
});
