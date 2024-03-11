import { render, screen } from '@testing-library/react';

import { StatusLabel } from './StatusLabel';

describe('ui/StatusLabel', () => {
  test('should render component', () => {
    render(<StatusLabel title="My label" subtitle="Subtitle" variant="success" />);

    const title = screen.getByText('My label');
    const subtitle = screen.getByText('Subtitle');

    expect(title).toBeInTheDocument();
    expect(subtitle).toBeInTheDocument();
  });

  test('should render 4 variants', () => {
    const { rerender } = render(<StatusLabel title="My label" variant="waiting" />);
    const title = screen.getByText('My label');
    expect(title).toHaveClass('text-text-tertiary');

    rerender(<StatusLabel title="My label" variant="success" />);
    expect(title).toHaveClass('text-text-positive');

    rerender(<StatusLabel title="My label" variant="warn" />);
    expect(title).toHaveClass('text-text-warning');

    rerender(<StatusLabel title="My label" variant="error" />);
    expect(title).toHaveClass('text-text-negative');
  });
});
