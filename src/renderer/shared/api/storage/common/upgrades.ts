import { Transaction } from 'dexie';

import { MultisigEventDS } from './types';

/**
 * Remove events from MultisigTransactions
 * Add events to separate table MultisigEvents
 * @param trans transactions from DB
 * @return {Promise}
 */
export const upgradeEvents = async (trans: Transaction): Promise<any> => {
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

// /**
//  * Add xcmDestination to MultisigTransactions
//  * @param trans transactions from DB
//  * @return {Promise}
//  */
// export const upgradeXcmMultisig = async (trans: Transaction): Promise<any> => {
//   const txs = await trans.table('multisigTransactions').toArray();
//   const newEvents = txs
//     .map((tx) =>
//       tx.events.map((e: MultisigEventDS) => ({
//         ...e,
//         txAccountId: tx.accountId,
//         txChainId: tx.chainId,
//         txCallHash: tx.callHash,
//         txBlock: tx.blockCreated,
//         txIndex: tx.indexCreated,
//       })),
//     )
//     .flat();
//
//   return trans
//     .table('multisigTransactions')
//     .toCollection()
//     .modify((tx) => {
//       tx.xcmDestination = '';
//     });
// };
