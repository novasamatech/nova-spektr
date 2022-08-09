import { render, screen } from '@testing-library/react';

import WatchOnlyFlow from './WatchOnlyFlow';

describe('screens/Onboarding/WatchOnlyFlow', () => {
  test('should render component', () => {
    render(<WatchOnlyFlow />);

    const text = screen.getByText('WatchOnlyFlow');
    expect(text).toBeInTheDocument();
  });
});
