import { type Transaction } from 'dexie';
import { produce } from 'immer';

import { type Address, type ID, type Transaction as LocalTransaction } from '@/shared/core';
import { nonNullable, toAccountId } from '@/shared/lib/utils';

type BasketTransaction = {
  id: ID;
  coreTx: LocalTransaction & {
    address?: Address;
  };
};

/**
 * Migration to replace address with accountId in coreTx of BasketTransaction
 */
export async function migrateBasketTransactionAfterAddressRemoval(t: Transaction): Promise<void> {
  const basketTransactions = await t.table<BasketTransaction>('basketTransactions').toArray();

  if (basketTransactions.length === 0) {
    return;
  }

  const transactionsToUpdate: BasketTransaction[] = [];

  for (const basketTx of basketTransactions) {
    if (basketTx.coreTx) {
      if ('address' in basketTx.coreTx && nonNullable(basketTx.coreTx.address)) {
        const updatedBasketTx = produce(basketTx, (draft) => {
          if (!draft.coreTx || !draft.coreTx.address) {
            return;
          }

          draft.coreTx.accountId = toAccountId(draft.coreTx.address);
          delete draft.coreTx.address;
        });

        transactionsToUpdate.push(updatedBasketTx);
      }
    }
  }

  if (transactionsToUpdate.length > 0) {
    await t.table('basketTransactions').bulkPut(transactionsToUpdate);
  }
}
