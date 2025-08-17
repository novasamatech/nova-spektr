import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { pending, spread } from 'patronum';

import { type Asset, type Chain, type EraIndex, type Validator } from '@/shared/core';
import { includesMultiple, nonNullable, toAccountId, toAddress } from '@/shared/lib/utils';
import { identity } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { type ValidatorMap, eraService, validatorsService } from '@/entities/staking';

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

const $chain = createStore<Chain | null>(null).reset(formCleared);
const $asset = createStore<Asset | null>(null).reset(formCleared);

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
};
const getValidatorsFx = createEffect(({ api, era }: ValidatorsParams): Promise<ValidatorMap> => {
  return validatorsService.getValidatorsWithInfo(api, era);
});

const $api = combine(
  {
    apis: networkModel.$apis,
    chain: $chain,
  },
  ({ apis, chain }) => {
    return chain ? apis[chain.chainId] : undefined;
  },
  { skipVoid: false },
);

const $identity = combine(identity.$list, $chain, (list, chain) => {
  if (!chain) return {};

  return list[chain.chainId] ?? {};
});

const $filteredValidators = combine(
  {
    query: $query,
    validators: $validators,
    identity: $identity,
  },
  ({ query, validators, identity }) => {
    if (!query) return validators;

    return validators.filter((validator) => {
      const address = toAddress(validator.accountId);
      const identityName = identity[validator.accountId]?.name || '';

      return includesMultiple([address, identityName], query);
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
  clock: formInitiated,
  target: spread({
    chain: $chain,
    asset: $asset,
  }),
});

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
    validators: $validators,
  },
  filter: ({ validators }, era) => {
    return Boolean(era) && validators.length === 0;
  },
  fn: ({ api }, era) => {
    return { api: api!, era: era! };
  },
  target: getValidatorsFx,
});

sample({
  clock: getValidatorsFx.doneData,
  fn: (validatorsMap) => Object.values(validatorsMap),
  target: $validators,
});

sample({
  clock: $validators.updates,
  source: $chain,
  filter: (chain, validators) => nonNullable(chain) && validators.length > 0,
  fn: (chain, validators) => {
    const accounts = validators.map((validator) => toAccountId(validator.accountId));

    return { accounts, chainId: chain!.chainId };
  },
  target: identity.request,
});

sample({
  clock: validatorToggled,
  source: $selectedValidators,
  filter: (_, validator) => !validator.blocked,
  fn: (selectedValidators, validator) => {
    const { [validator.accountId]: validatorToRemove, ...rest } = selectedValidators;

    return validatorToRemove ? rest : { ...rest, [validator.accountId]: validator };
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
  $chain,
  $asset,
  $query,
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
