import { type Transaction } from 'dexie';

import { TransactionType } from '@/shared/core';

interface BasketTransaction {
  id: string;
  initiatorAccountId: string;
  coreTx: {
    type: string;
    [key: string]: unknown;
  };
  route: unknown[];
  error?: unknown;
  createdAt: number;
}

/**
 * Migration to change all basket transactions with type REVOTE to VOTE
 */
export async function migrateRevoteToVote(t: Transaction): Promise<void> {
  const basketTransactions = await t.table<BasketTransaction>('basketTransactions').toArray();

  if (basketTransactions.length === 0) {
    return;
  }

  const transactionsToUpdate: BasketTransaction[] = [];

  for (const basketTx of basketTransactions) {
    // Check if the core transaction type is 'revote' (case-insensitive)
    if (basketTx.coreTx?.type && basketTx.coreTx.type.toLowerCase() === 'revote') {
      // Create updated transaction with VOTE type
      const updatedBasketTx: BasketTransaction = {
        ...basketTx,
        coreTx: {
          ...basketTx.coreTx,
          type: TransactionType.VOTE,
        },
      };

      transactionsToUpdate.push(updatedBasketTx);
    }
  }

  if (transactionsToUpdate.length > 0) {
    await t.table('basketTransactions').bulkPut(transactionsToUpdate);
  }
}
