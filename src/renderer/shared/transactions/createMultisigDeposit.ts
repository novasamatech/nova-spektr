import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { type Store } from 'effector';

import { createStoreFromEffect } from '@/shared/effector';
import { transactionService } from '@/entities/transaction';

type Params = {
  $threshold: Store<number | null>;
  $api: Store<ApiPromise | null>;
};

type DepositParams = {
  api: ApiPromise;
  threshold: number;
};

export const createMultisigDeposit = ({ $threshold, $api }: Params) => {
  const { $: $multisigDeposit, $pending } = createStoreFromEffect<DepositParams, BN>({
    defaultValue: BN_ZERO,
    params: { threshold: $threshold, api: $api },
    fn: ({ threshold, api }) => new BN(transactionService.getMultisigDeposit(threshold, api)),
  });

  return {
    $multisigDeposit,
    $pending,
  };
};
