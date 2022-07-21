import { render, screen } from '@testing-library/react';

import Settings from './Settings';

describe('screen/Settings', () => {
  test('should render component', () => {
    render(<Settings />);

    const text = screen.getByText('Settings');
    expect(text).toBeInTheDocument();
  });
});
