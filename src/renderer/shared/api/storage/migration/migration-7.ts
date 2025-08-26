import { type Transaction } from 'dexie';

import { type TxWrapper } from '@/shared/core';
// eslint-disable-next-line boundaries/element-types
import { type BasketTransaction } from '@/aggregates/basket-operations';

type OldTBasketTransaction = Omit<BasketTransaction, 'route'> & {
  txWrappers: TxWrapper[];
};

export async function migrateCASBasket(t: Transaction): Promise<void> {
  const operations = await t.db.table<OldTBasketTransaction>('basketTransactions').toArray();
  const newOperations = operations.map<BasketTransaction>((op) => {
    return {
      id: op.id,
      coreTx: op.coreTx,
      createdAt: op.createdAt,
      error: op.error,
      initiatorAccountId: op.initiatorAccountId,
      route: op.txWrappers.map((wrapper) => {
        if (wrapper.kind === 'multisig') {
          return wrapper.multisigAccount;
        } else {
          return wrapper.proxiedAccount;
        }
      }),
    };
  });

  await t.table('basketTransactions').bulkPut(newOperations);
}
