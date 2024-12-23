import { render, screen } from '@testing-library/react';

import EmptyOperations from './EmptyOperations';

jest.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('pages/Operations/components/EmptyState/EmptyOperations', () => {
  test('should render component', () => {
    render(<EmptyOperations multisigAccount={null} isEmptyFromFilters={false} />);

    const label = screen.getByText('operations.noOperationsWalletNotMulti');

    expect(label).toBeInTheDocument();
  });
});
