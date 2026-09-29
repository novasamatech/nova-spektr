import { type ApiPromise } from '@polkadot/api';
import { type Store, combine } from 'effector';

import { type Transaction } from '@/shared/core';
import { createStoreFromEffect } from '@/shared/effector';
import { nonNullable } from '@/shared/lib/utils';
import { transactionService } from '@/domains/network';
import { getExtrinsic } from '@/entities/transaction';

type Params = {
  api: Store<ApiPromise | null>;
  /** The transaction that will be signed, carrying all `rows` in one batch. */
  transaction: Store<Transaction | null>;
  rows: Store<number | null>;
};

/**
 * Checks that a batch built from user-supplied rows (e.g. a CSV file) fits into
 * a single extrinsic. Such a batch is one operation for the user, so it must be
 * signed as one: when it is too heavy, the form reports how many rows fit
 * instead of letting the batch be split at signing time.
 */
export const createBatchCapacityCheck = ({ api, transaction, rows }: Params) => {
  const { $: $maxRows, $pending } = createStoreFromEffect({
    defaultValue: null,
    params: { api, transaction, rows },
    fn: async ({ api, transaction, rows }): Promise<number | null> => {
      const extrinsic = getExtrinsic[transaction.type](transaction.args, api);
      const capacity = await transactionService.getBatchCapacity(extrinsic, api, rows);

      return capacity < rows ? capacity : null;
    },
  });

  return {
    /** How many rows fit into one extrinsic; `null` while the whole batch fits. */
    $maxRows,
    /** True while the check is running or the batch is too heavy. */
    $blocksSubmit: combine($maxRows, $pending, (maxRows, pending) => pending || nonNullable(maxRows)),
  };
};
