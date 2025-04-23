import { createStore } from 'effector';

import { nullable, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { deriveFromResources } from '@/shared/resource';
import { type CollectivesStruct } from '../_lib/types';

import { claimantStatusResource, salariesResource, statusResource } from './resource';
import { type ClaimStatus, type Salaries, type SalaryCycle } from './types';

const $status = createStore<CollectivesStruct<SalaryCycle | null>>({});

deriveFromResources({
  store: $status,
  resources: [statusResource],
  map(state, status) {
    if (nullable(status)) return state;

    return setNestedValue(state, status.pallet, status.chainId, status);
  },
});

const $salaries = createStore<CollectivesStruct<Salaries>>({});

deriveFromResources({
  store: $salaries,
  resources: [salariesResource],
  map(state, salaries) {
    return setNestedValue(state, salaries.pallet, salaries.chainId, salaries);
  },
});

const $claimantStatus = createStore<CollectivesStruct<Record<AccountId, ClaimStatus>>>({});

deriveFromResources({
  store: $claimantStatus,
  resources: [claimantStatusResource],
  map(state, claimantStatus) {
    const previousState = pickNestedValue(state, claimantStatus.pallet, claimantStatus.chainId) ?? {};

    return setNestedValue(state, claimantStatus.pallet, claimantStatus.chainId, {
      ...previousState,
      ...claimantStatus.data,
    });
  },
});

export const salary = {
  $status,
  $salaries,
  $claimantStatus,
  requestStatus: statusResource.request,
  requestSalaries: salariesResource.request,
  requestClaimantStatus: claimantStatusResource.request,
};
