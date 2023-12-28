import { Transaction } from 'dexie';

import { MultisigEventDS } from '../lib/types';

/**
 * Remove events from MultisigTransactions
 * Add events to separate table MultisigEvents
 * @param trans transactions from DB
 * @return {Promise}
 */
export async function migrateEvents(trans: Transaction): Promise<void> {
  const txs = await trans.table('multisigTransactions').toArray();
  const newEvents = txs
    .map((tx) =>
      tx.events.map((e: MultisigEventDS) => ({
        ...e,
        txAccountId: tx.accountId,
        txChainId: tx.chainId,
        txCallHash: tx.callHash,
        txBlock: tx.blockCreated,
        txIndex: tx.indexCreated,
      })),
    )
    .flat();

  await Promise.all([
    trans
      .table('multisigTransactions')
      .toCollection()
      .modify((tx) => {
        delete tx.events;
      }),
    trans.table('multisigEvents').bulkAdd(newEvents),
  ]);
}
