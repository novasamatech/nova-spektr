import { type HexString, type Transaction, TransactionType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { basketOperationsService } from './service';

describe('basketOperationsService', () => {
  const neededCoreTx: Transaction = {
    chainId: '0x00' as HexString,
    accountId: '0x00' as AccountId,
    type: TransactionType.TRANSFER,
    args: {},
  };

  const basketTx = {
    id: 0,
    initiatorAccountId: '0x00' as AccountId,
    coreTx: neededCoreTx,
    route: [],
    createdAt: Date.now(),
  };

  const createBatch = (transactions: unknown[]): Transaction => ({
    ...neededCoreTx,
    type: TransactionType.BATCH_ALL,
    args: { transactions },
  });

  test('should get core tx from basket operation', () => {
    const coreTx = basketOperationsService.getCoreTx(basketTx);

    expect(coreTx).toEqual(neededCoreTx);
  });

  test('should unwrap batch to its core transaction', () => {
    const unlock = { type: TransactionType.UNLOCK, args: { value: '1' } };
    const batch = createBatch([unlock]);

    expect(basketOperationsService.getCoreTx({ ...basketTx, coreTx: batch })).toBe(unlock);
  });

  test('should fall back to the batch itself when no core transaction is found', () => {
    const nested = createBatch([{ type: TransactionType.BATCH_ALL, args: { transactions: [] } }]);

    expect(basketOperationsService.getCoreTx({ ...basketTx, coreTx: nested })).toBe(nested);
  });
});
