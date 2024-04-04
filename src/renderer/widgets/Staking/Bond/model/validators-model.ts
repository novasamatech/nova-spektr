import { createEvent, createEffect, combine, sample, restore, createStore } from 'effector';
import { ApiPromise } from '@polkadot/api';

import { Chain, Asset } from '@shared/core';
import { networkModel } from '@entities/network';
import { validatorsService } from '@entities/staking';

type Input = {
  chain: Chain;
  asset: Asset;
};

const formInitiated = createEvent<Input>();
const formSubmitted = createEvent();

const $validatorsStore = restore(formInitiated, null);
const $maxValidators = createStore<number>(0);

const getMaxValidatorsFx = createEffect((api: ApiPromise): number => {
  return validatorsService.getMaxValidators(api);
});

const $api = combine(
  {
    apis: networkModel.$apis,
    store: $validatorsStore,
  },
  ({ apis, store }) => {
    return store ? apis[store.chain.chainId] : null;
  },
);

sample({
  clock: $api.updates,
  source: $maxValidators,
  filter: (maxValidators, api) => !maxValidators && Boolean(api),
  fn: (_, api) => api!,
  target: getMaxValidatorsFx,
});

sample({
  clock: getMaxValidatorsFx.doneData,
  target: $maxValidators,
});

export const validatorsModel = {
  $validatorsStore,

  $api,
  events: {
    formInitiated,
  },
  output: {
    formSubmitted,
  },
};
