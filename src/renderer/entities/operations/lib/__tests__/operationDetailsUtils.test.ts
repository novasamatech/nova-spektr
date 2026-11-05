import { TransactionType } from '@/shared/core';
import { type MultisigOperation } from '@/domains/network';
import { getPayee } from '../operationDetailsUtils';

const createOperation = (transaction: unknown) => ({ transaction }) as unknown as MultisigOperation;

describe('entities/operations/lib/operationDetailsUtils getPayee', () => {
  test('should return the payee of the first batched transaction', () => {
    const operation = createOperation({
      type: TransactionType.BATCH_ALL,
      args: { transactions: [{ args: { payee: 'Staked' } }] },
    });

    expect(getPayee(operation)).toBe('Staked');
  });

  test('should return no payee for an empty batch', () => {
    const operation = createOperation({ type: TransactionType.BATCH_ALL, args: { transactions: [] } });

    expect(getPayee(operation)).toBeUndefined();
  });
});
