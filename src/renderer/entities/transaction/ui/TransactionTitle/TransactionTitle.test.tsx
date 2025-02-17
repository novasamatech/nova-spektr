import { render, screen } from '@testing-library/react';

import { TransactionTitle } from './TransactionTitle';

describe('pages/Operations/components/TransactionTitle', () => {
  test('should render component', () => {
    render(<TransactionTitle title="operations.titles.transfer" />);

    const title = screen.getByText('operations.titles.transfer');
    expect(title).toBeInTheDocument();
  });
});
