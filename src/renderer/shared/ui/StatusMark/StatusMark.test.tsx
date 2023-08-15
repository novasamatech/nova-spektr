import { render, screen } from '@testing-library/react';

import { StatusMark } from './StatusMark';

describe('ui/StatusMark', () => {
  test('should render component', () => {
    render(<StatusMark title="My label" subtitle="Subtitle" variant="success" />);

    const title = screen.getByText('My label');
    const subtitle = screen.getByText('Subtitle');

    expect(title).toBeInTheDocument();
    expect(subtitle).toBeInTheDocument();
  });

  test('should render 4 variants', () => {
    const { rerender } = render(<StatusMark title="My label" variant="waiting" />);
    const title = screen.getByText('My label');
    expect(title).toHaveClass('text-text-tertiary');

    rerender(<StatusMark title="My label" variant="success" />);
    expect(title).toHaveClass('text-text-positive');

    rerender(<StatusMark title="My label" variant="warn" />);
    expect(title).toHaveClass('text-text-warning');

    rerender(<StatusMark title="My label" variant="error" />);
    expect(title).toHaveClass('text-text-negative');
  });
});
