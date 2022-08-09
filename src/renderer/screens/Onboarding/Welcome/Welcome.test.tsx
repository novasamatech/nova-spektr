import { render, screen } from '@testing-library/react';

import Welcome from './Welcome';

describe('screens/Onboarding/Welcome', () => {
  test('should render component', () => {
    render(<Welcome />);

    const text = screen.getByText('Welcome');
    expect(text).toBeInTheDocument();
  });
});
