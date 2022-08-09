import { render, screen } from '@testing-library/react';

import ParityFlow from './ParityFlow';

describe('screens/Onboarding/ParityFlow', () => {
  test('should render component', () => {
    render(<ParityFlow />);

    const text = screen.getByText('ParityFlow');
    expect(text).toBeInTheDocument();
  });
});
