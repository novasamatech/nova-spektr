import { type ApiPromise } from '@polkadot/api';
import { BN_ZERO } from '@polkadot/util';
import { zipWith } from 'lodash';

import { type ChainId } from '@/shared/core';
import { createDataSource } from '@/shared/effector';
import { nullable, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { salaryPallet } from '@/shared/pallet/salary';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { type ClaimStatus, type Salaries, type SalaryCycle } from './types';

type StatusRequestParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
  chainId: ChainId;
};

const { $: $status, request: requestStatus } = createDataSource({
  initial: {} as CollectivesStruct<SalaryCycle | null>,
  async fn({ api, palletType }: StatusRequestParams): Promise<SalaryCycle | null> {
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

type ClaimantRequestParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
  chainId: ChainId;
  accounts: AccountId[];
};

const { $: $claimantStatus, request: requestClaimantStatus } = createDataSource({
  initial: {} as CollectivesStruct<Record<AccountId, ClaimStatus>>,
  async fn({ api, palletType, accounts }: ClaimantRequestParams): Promise<Record<AccountId, ClaimStatus>> {
    const claimants = await salaryPallet.storage.claimant(palletType, api, accounts);
    const mapped = zipWith(claimants, accounts, (claim, account) => ({ account, claim }));

    const res: Record<AccountId, ClaimStatus> = {};

    for (const { account, claim } of mapped) {
      if (nullable(claim)) {
        res[account] = {
          type: 'none',
          lastActive: 1,
        };
        continue;
      }

      if (claim.status.type === 'Nothing') {
        res[account] = {
          type: 'nothing',
          lastActive: claim.lastActive,
        };
        continue;
      }

      if (claim.status.type === 'Registered') {
        res[account] = {
          type: 'registered',
          amount: claim.status.data,
          lastActive: claim.lastActive,
        };
      }

      if (claim.status.type === 'Attempted') {
        res[account] = {
          type: 'payout',
          registered: claim.status.data.registered ?? BN_ZERO,
          amount: claim.status.data.amount,
          lastActive: claim.lastActive,
        };
      }
    }

    return res;
  },
  map(store, { params, result }) {
    const previousState = pickNestedValue(store, params.palletType, params.chainId) ?? {};

    return setNestedValue(store, params.palletType, params.chainId, { ...previousState, ...result });
  },
});

export const salary = {
  $status,
  $salaries,
  $claimantStatus,
  requestStatus,
  requestSalaries,
  requestClaimantStatus,
};
