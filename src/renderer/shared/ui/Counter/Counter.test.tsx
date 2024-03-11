import { render, screen } from '@testing-library/react';

import { Counter } from './Counter';

describe('ui/Counter', () => {
  test('should render component', () => {
    render(<Counter variant="success">25</Counter>);

    const count = screen.getByText('25');
    expect(count).toBeInTheDocument();
  });

  test('should render 4 variants', () => {
    const { rerender } = render(<Counter variant="waiting">44</Counter>);
    const wrapper = screen.getByText('44').closest('div');
    expect(wrapper).toHaveClass('bg-chip-icon');

    rerender(<Counter variant="success">44</Counter>);
    expect(wrapper).toHaveClass('bg-icon-positive');

    rerender(<Counter variant="warn">44</Counter>);
    expect(wrapper).toHaveClass('bg-icon-warning');

    rerender(<Counter variant="error">44</Counter>);
    expect(wrapper).toHaveClass('bg-icon-negative');
  });
});
