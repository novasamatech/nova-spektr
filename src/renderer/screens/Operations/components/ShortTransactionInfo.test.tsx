import { act, render, screen } from '@testing-library/react';

import ShortTransactionInfo from './ShortTransactionInfo';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { TEST_ADDRESS, TEST_CHAIN_ID } from '@renderer/shared/utils/constants';

jest.mock('@renderer/context/I18nContext', () => ({
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
    assetId: '0',
  },
} as Transaction;

describe('screen/Operations/components/ShortTransactionInfo', () => {
  test('should render component', async () => {
    await act(async () => {
      render(<ShortTransactionInfo tx={transaction} />);
    });

    const symbol = screen.getByText('DOT');
    expect(symbol).toBeInTheDocument();

    const value = screen.getByText('assetBalance.number');
    expect(value).toBeInTheDocument();
  });
});
