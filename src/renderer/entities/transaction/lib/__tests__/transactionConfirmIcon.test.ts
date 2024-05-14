import { getIconName } from '../transactionConfirmIcon';
import { Transaction, TransactionType } from '../../../../shared/core/types/transaction';

describe('entities/transaction/lib/transactionConfirmIcon', () => {
  test('should get transfer confirm icon for transfer transaction', () => {
    const tx = { type: TransactionType.TRANSFER } as unknown as Transaction;

    expect(getIconName(tx)).toEqual('transferConfirm');
  });

  test('should get transfer confirm icon for proxy transfer transaction', () => {
    const tx = {
      type: TransactionType.PROXY,
      args: { transaction: { type: TransactionType.TRANSFER } },
    } as unknown as Transaction;

    expect(getIconName(tx)).toEqual('transferConfirm');
  });

  test('should get transfer confirm icon for batch all with transfer transaction', () => {
    const tx = {
      type: TransactionType.BATCH_ALL,
      args: { transactions: [{ type: TransactionType.TRANSFER }] },
    } as unknown as Transaction;

    expect(getIconName(tx)).toEqual('transferConfirm');
  });

  test('should get unknown confirm icon for unknown transaction', () => {
    const tx = {} as unknown as Transaction;

    expect(getIconName(tx)).toEqual('unknownConfirm');
  });
});
