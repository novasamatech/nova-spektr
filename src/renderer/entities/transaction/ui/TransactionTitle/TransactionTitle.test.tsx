import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { type Transaction, TransactionType } from '@/shared/core';
import { TEST_ADDRESS, TEST_CHAIN_ID } from '@/shared/lib/utils';

import { TransactionTitle } from './TransactionTitle';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

const transaction = {
  type: TransactionType.TRANSFER,
  address: TEST_ADDRESS,
  chainId: TEST_CHAIN_ID,
  args: {
    dest: TEST_ADDRESS,
    value: '100000000000',
  },
} as Transaction;

describe('pages/Operations/components/TransactionTitle', () => {
  test('should render component', () => {
    render(<TransactionTitle tx={transaction} />);

    const title = screen.getByText('operations.titles.transfer');
    expect(title).toBeInTheDocument();
  });
});
