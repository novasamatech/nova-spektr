import { render, screen } from '@testing-library/react';

import Dashboard from './Dashboard';

describe('Dashboard', () => {
  test('should render component', () => {
    render(<Dashboard />);

    const text = screen.getByText('Dashboard');
    expect(text).toBeInTheDocument();
  });
});
