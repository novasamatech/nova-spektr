import { act, render, screen } from '@testing-library/react';

import TransactionAmount from './TransactionAmount';
import { Transaction, TransactionType } from '@renderer/entities/transaction/model/transaction';
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
    assetId: '0',
  },
} as Transaction;

describe('screen/Operations/components/ShortTransactionInfo', () => {
  test('should render component', async () => {
    await act(async () => {
      render(
        <div data-testid="123">
          <TransactionAmount tx={transaction} />
        </div>,
      );
    });

    const container = screen.getByTestId('123');

    const paragraph = container.querySelector('span');
    expect(paragraph).toHaveTextContent('DOT');

    expect(paragraph).toHaveTextContent('assetBalance.number');
  });
});
