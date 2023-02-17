import { render, screen } from '@testing-library/react';

import ProgressBadge from './ProgressBadge';

describe('ui/ProgressBadge', () => {
  test('should render component', () => {
    render(
      <ProgressBadge progress={2} total={4}>
        Transactions
      </ProgressBadge>,
    );

    const child = screen.getByText('Transactions');
    const progress = screen.getByText('2');
    const total = screen.getByText('4');
    expect(child).toBeInTheDocument();
    expect(progress).toBeInTheDocument();
    expect(total).toBeInTheDocument();
  });
});
