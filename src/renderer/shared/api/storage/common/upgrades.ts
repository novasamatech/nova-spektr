import { Transaction } from 'dexie';

import { MultisigEventDS } from './types';

export const upgradeEvents = async (trans: Transaction) => {
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

  return Promise.all([
    trans
      .table('multisigTransactions')
      .toCollection()
      .modify((tx) => {
        delete tx.events;
      }),
    trans.table('multisigEvents').bulkAdd(newEvents),
  ]);
};
