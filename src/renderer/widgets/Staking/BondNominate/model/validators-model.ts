import { createEvent, createEffect, combine, sample, restore, createStore } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { pending } from 'patronum';

import { Chain, Asset, Validator, EraIndex } from '@shared/core';
import { networkModel, networkUtils } from '@entities/network';
import { validatorsService, ValidatorMap } from '@entities/staking';
import { eraService } from '@entities/staking/api';
import { isStringsMatchQuery } from '@shared/lib/utils';

type Input = {
  chain: Chain;
  asset: Asset;
};

const formInitiated = createEvent<Input>();
const formSubmitted = createEvent<Validator[]>();
const formCleared = createEvent();
const queryChanged = createEvent<string>();
const validatorToggled = createEvent<Validator>();
const validatorsSubmitted = createEvent();

const $query = restore(queryChanged, '').reset(formCleared);
const $validatorsStore = restore(formInitiated, null).reset(formCleared);

const $era = createStore<EraIndex | null>(null).reset(formCleared);
const $maxValidators = createStore<number>(0).reset(formCleared);
const $validators = createStore<Validator[]>([]).reset(formCleared);
const $selectedValidators = createStore<ValidatorMap>({}).reset(formCleared);

const getActiveEraFx = createEffect((api: ApiPromise): Promise<EraIndex | undefined> => {
  return eraService.getActiveEra(api);
});

const getMaxValidatorsFx = createEffect((api: ApiPromise): number => {
  return validatorsService.getMaxValidators(api);
});

type ValidatorsParams = {
  api: ApiPromise;
  era: EraIndex;
  isLightClient: boolean;
};
const getValidatorsFx = createEffect(({ api, era, isLightClient }: ValidatorsParams): Promise<ValidatorMap> => {
  return validatorsService.getValidatorsWithInfo(api, era, isLightClient);
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

const $filteredValidators = combine(
  {
    query: $query,
    validators: $validators,
  },
  ({ query, validators }) => {
    if (!query) return validators;

    return validators.filter((validator) => {
      return isStringsMatchQuery(query, [
        validator.address,
        validator.identity?.subName || '',
        validator.identity?.parent.name || '',
      ]);
    });
  },
);

const $selectedAmount = combine($selectedValidators, (selectedValidators) => {
  return Object.keys(selectedValidators).length;
});

const $canSubmit = combine(
  {
    selectedAmount: $selectedAmount,
    maxValidators: $maxValidators,
  },
  ({ selectedAmount, maxValidators }) => {
    return selectedAmount > 0 && selectedAmount <= maxValidators;
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

sample({
  clock: $api.updates,
  source: $era,
  filter: (era, api) => !era && Boolean(api),
  fn: (_, api) => api!,
  target: getActiveEraFx,
});

sample({
  clock: getActiveEraFx.doneData,
  filter: (era): era is EraIndex => Boolean(era),
  target: $era,
});

sample({
  clock: $era.updates,
  source: {
    api: $api,
    connections: networkModel.$connections,
    validatorsStore: $validatorsStore,
    validators: $validators,
  },
  filter: ({ validatorsStore, validators }, era) => {
    return Boolean(validatorsStore) && Boolean(era) && validators.length === 0;
  },
  fn: ({ api, connections, validatorsStore }, era) => {
    const isLightClient = networkUtils.isLightClientConnection(connections[validatorsStore!.chain.chainId]);

    return { api: api!, era: era!, isLightClient };
  },
  target: getValidatorsFx,
});

sample({
  clock: getValidatorsFx.doneData,
  fn: (validatorsMap) => Object.values(validatorsMap),
  target: $validators,
});

sample({
  clock: validatorToggled,
  source: $selectedValidators,
  filter: (_, validator) => !validator.blocked,
  fn: (selectedValidators, validator) => {
    const { [validator.address]: validatorToRemove, ...rest } = selectedValidators;

    return validatorToRemove ? rest : { ...rest, [validator.address]: validator };
  },
  target: $selectedValidators,
});

sample({
  clock: validatorsSubmitted,
  source: {
    selectedValidators: $selectedValidators,
    selectedAmount: $selectedAmount,
  },
  filter: ({ selectedAmount }) => Boolean(selectedAmount),
  fn: ({ selectedValidators }) => Object.values(selectedValidators),
  target: formSubmitted,
});

export const validatorsModel = {
  $query,
  $validatorsStore,
  $validators: $filteredValidators,
  $maxValidators,
  $selectedValidators,
  $selectedAmount,

  $api,
  $canSubmit,
  $isValidatorsLoading: pending([getActiveEraFx, getValidatorsFx]),
  events: {
    formInitiated,
    formCleared,
    queryChanged,
    validatorToggled,
    validatorsSubmitted,
  },
  output: {
    formSubmitted,
  },
};
