import { type ApiPromise } from '@polkadot/api';
import { BN_ZERO } from '@polkadot/util';
import { createStore } from 'effector';
import { zipWith } from 'lodash';

import { nullable, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { salaryPallet } from '@/shared/pallet/salary';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource, createSubscriptionResource } from '@/shared/query';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { type ClaimStatus, type Salaries, type SalaryCycle } from './types';

export type SalaryCycleRequestParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
};

export const salaryCycleResource = createQueryResource<SalaryCycleRequestParams>({
  key: ({ palletType, api }) => [palletType, api.genesisHash.toHex()],
})
  .request<SalaryCycle | null>(async ({ api, palletType }) => {
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
  })
  .cache<CollectivesStruct<SalaryCycle | null>>({
    store: createStore({}),
    map(state, status, params) {
      const { palletType, api } = params;

      if (nullable(status)) return state;

      return setNestedValue(state, palletType, api.genesisHash.toHex(), status);
    },
  })
  .build();

export type SalariesRequestParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
};

export const salariesResource = createQueryResource<SalariesRequestParams>({
  key: ({ palletType, api }) => [palletType, api.genesisHash.toHex()],
})
  .request<Salaries>(async ({ api, palletType }) => {
    const response = await collectiveCorePallet.storage.params(palletType, api);

    return {
      active: response.activeSalary,
      passive: response.passiveSalary,
    };
  })
  .cache<CollectivesStruct<Salaries>>({
    staleAfter: Number.POSITIVE_INFINITY,
    store: createStore({}),
    map(state, salaries, { palletType, api }) {
      return setNestedValue(state, palletType, api.genesisHash.toHex(), salaries);
    },
  })
  .build();

export type ClaimantRequestParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
  accounts: AccountId[];
};

export const claimantStatusResource = createSubscriptionResource<ClaimantRequestParams>({
  key: ({ palletType, api, accounts }) => [palletType, api.genesisHash.toHex(), accounts],
})
  .subscribe<Record<AccountId, ClaimStatus>>(({ api, palletType, accounts }, callback) => {
    return salaryPallet.storage.claimantWatch(palletType, api, accounts, claimants => {
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

      callback(res);
    });
  })
  .cache<CollectivesStruct<Record<AccountId, ClaimStatus>>>({
    store: createStore({}),
    map(state, claimantStatus, { palletType, api }) {
      const chainId = api.genesisHash.toHex();
      const previousState = pickNestedValue(state, palletType, chainId) ?? {};
      return setNestedValue(state, palletType, chainId, {
        ...previousState,
        ...claimantStatus,
      });
    },
  })
  .build();
