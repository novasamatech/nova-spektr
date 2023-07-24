import { act, render, screen } from '@testing-library/react';

import TransactionTitle from './TransactionTitle';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { TEST_ADDRESS, TEST_CHAIN_ID } from '@renderer/shared/lib/utils';

jest.mock('@renderer/app/providers', () => ({
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

describe('screen/Operations/components/TransactionTitle', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<TransactionTitle tx={transaction} />);
    });

    const title = screen.getByText('operations.titles.transfer');
    expect(title).toBeInTheDocument();
  });
});
