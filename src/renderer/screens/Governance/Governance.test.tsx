import { render, screen } from '@testing-library/react';

import Governance from './Governance';

describe('Governance', () => {
  test('should render component', () => {
    render(<Governance />);

    const text = screen.getByText('Governance');
    expect(text).toBeInTheDocument();
  });
});
