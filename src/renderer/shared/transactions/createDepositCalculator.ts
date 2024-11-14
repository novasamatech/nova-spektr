import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { type Store, combine, createEffect, createStore, sample } from 'effector';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { transactionService } from '@/entities/transaction';

type Params = {
  $threshold: Store<number | null>;
  $api: Store<ApiPromise | null>;
};

type DepositParams = {
  api: ApiPromise;
  threshold: number;
};

export const createDepositCalculator = ({ $threshold, $api }: Params) => {
  const $source = combine({ threshold: $threshold, api: $api }, ({ threshold, api }) => {
    if (nullable(threshold) || nullable(api)) return null;

    return { threshold, api };
  });

  const $deposit = createStore(BN_ZERO);

  const getMultisigDepositFx = createEffect(({ api, threshold }: DepositParams): string => {
    return transactionService.getMultisigDeposit(threshold, api);
  });

  sample({
    clock: $source,
    filter: nullable,
    fn: () => BN_ZERO,
    target: $deposit,
  });

  sample({
    clock: $source,
    filter: nonNullable,
    target: getMultisigDepositFx,
  });

  sample({
    clock: getMultisigDepositFx.doneData,
    filter: nonNullable,
    fn: (deposit) => new BN(deposit),
    target: $deposit,
  });

  return { $deposit, $pending: getMultisigDepositFx.pending };
};
