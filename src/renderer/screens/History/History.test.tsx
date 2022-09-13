import { render, screen } from '@testing-library/react';

import History from './History';

describe('screens/History', () => {
  test('should render component', () => {
    render(<History />);

    const text = screen.getByText('History');
    expect(text).toBeInTheDocument();
  });
});
