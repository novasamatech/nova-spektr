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
  map(state, status, metadata) {
    const { palletType, chainId } = metadata!.params;

    if (nullable(status)) return state;

    return setNestedValue(state, palletType, chainId, status);
  },
});

const $salaries = createStore<CollectivesStruct<Salaries>>({});

deriveFromResources({
  store: $salaries,
  resources: [salariesResource],
  map(state, salaries, metadata) {
    const { palletType, chainId } = metadata!.params;

    return setNestedValue(state, palletType, chainId, salaries);
  },
});

const $claimantStatus = createStore<CollectivesStruct<Record<AccountId, ClaimStatus>>>({});

deriveFromResources({
  store: $claimantStatus,
  resources: [claimantStatusResource],
  map(state, claimantStatus, metadata) {
    const { palletType, chainId } = metadata!.params;

    const previousState = pickNestedValue(state, palletType, chainId) ?? {};

    return setNestedValue(state, palletType, chainId, {
      ...previousState,
      ...claimantStatus,
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
