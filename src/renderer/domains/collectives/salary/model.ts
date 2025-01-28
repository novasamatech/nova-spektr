import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';
import { createDataSource } from '@/shared/effector';
import { nullable, setNestedValue } from '@/shared/lib/utils';
import { salaryPallet } from '@/shared/pallet/salary';
import { collectiveCorePallet } from '../../../shared/pallet/collectiveCore';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { type Salaries, type SalaryCycleStatus } from './types';

type StatusRequestParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
  chainId: ChainId;
};

const { $: $status, request: requestStatus } = createDataSource({
  initial: {} as CollectivesStruct<SalaryCycleStatus | null>,
  async fn({ api, palletType }: StatusRequestParams): Promise<SalaryCycleStatus | null> {
    const status = await salaryPallet.storage.status(palletType, api);
    if (nullable(status)) return null;

    const registrationPeriod = salaryPallet.consts.registrationPeriod(palletType, api);
    const payoutPeriod = salaryPallet.consts.payoutPeriod(palletType, api);

    return {
      cycleIndex: status.cycleIndex,
      cycleStart: status.cycleStart,
      registrationPeriod,
      payoutPeriod,
      budget: status.budget,
      totalRegistrations: status.totalRegistrations,
      totalUnregisteredPaid: status.totalUnregisteredPaid,
    };
  },
  map(store, { params, result }) {
    return setNestedValue(store, params.palletType, params.chainId, result);
  },
});

type SalariesRequestParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
  chainId: ChainId;
};

const { $: $salaries, request: requestSalaries } = createDataSource({
  initial: {} as CollectivesStruct<Salaries>,
  async fn({ api, palletType }: SalariesRequestParams): Promise<Salaries> {
    const params = await collectiveCorePallet.storage.params(palletType, api);

    return {
      active: params.activeSalary,
      passive: params.passiveSalary,
    };
  },
  map(store, { params, result }) {
    return setNestedValue(store, params.palletType, params.chainId, result);
  },
});

export const salary = {
  $status,
  $salaries,
  requestStatus,
  requestSalaries,
};
