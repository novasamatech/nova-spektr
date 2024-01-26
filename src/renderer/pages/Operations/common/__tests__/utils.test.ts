import { Transaction, TransactionType } from '@entities/transaction';
import { getTransactionTitle, getModalTransactionTitle } from '../utils';

describe('pages/Operations/common/utils.ts', () => {
  test('should return correct tx title for transfer transaction', () => {
    const tx = { type: TransactionType.TRANSFER } as unknown as Transaction;
    const title = getTransactionTitle(tx);

    expect(title).toBe('operations.titles.transfer');
  });

  test('should return correct tx title for batch with transfer transaction', () => {
    const tx = {
      type: TransactionType.BATCH_ALL,
      args: {
        transactions: [{ type: TransactionType.TRANSFER } as unknown as Transaction],
      },
    } as unknown as Transaction;
    const title = getTransactionTitle(tx);

    expect(title).toBe('operations.titles.transfer');
  });

  test('should return correct modal title for transfer transaction', () => {
    const tx = { type: TransactionType.TRANSFER } as unknown as Transaction;
    const title = getModalTransactionTitle(false, tx);

    expect(title).toBe('operations.modalTitles.transferOn');
  });

  test('should return correct modal title for cross chain transfer transaction', () => {
    const tx = { type: TransactionType.TRANSFER } as unknown as Transaction;
    const title = getModalTransactionTitle(true, tx);

    expect(title).toBe('operations.modalTitles.transferFrom');
  });

  test('should return correct modal title for unknown transaction', () => {
    const tx = { section: 'unknownSection', method: 'unknownMethod' } as unknown as Transaction;
    const title = getModalTransactionTitle(true, tx);

    expect(title).toBe('Unknown section: Unknown method');
  });
});
