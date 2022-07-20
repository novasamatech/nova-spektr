import { render, screen } from '@testing-library/react';

import Assets from './Assets';

describe('Assets', () => {
  test('should render component', () => {
    render(<Assets />);

    const text = screen.getByText('Assets');
    expect(text).toBeInTheDocument();
  });
});
