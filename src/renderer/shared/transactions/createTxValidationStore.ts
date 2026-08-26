import { type Store, createStore } from 'effector';
import { and, not } from 'patronum';

import { type Balance } from '@/shared/core';
import { createStoreFromEffect } from '@/shared/effector';

import { type Validator } from './createTxValidator';

type AnyValidator = Validator<any>;

type Stores<Args> = {
  [K in keyof Args]: Store<Args[K] | null>;
};

type ValidatorParams<Validator extends AnyValidator> = Parameters<Validator>[0];

type Params<Validator extends AnyValidator> = {
  params: Stores<ValidatorParams<Validator>>;
  validator: Validator;
  calculateAvailable?: {
    exclude: string[];
  };
};

export const createTxValidationStore = <Validator extends AnyValidator>({
  params,
  validator,
  calculateAvailable,
}: Params<Validator>) => {
  const { $, $isDefaultValue, $pending, $error, retry } = createStoreFromEffect({
    params,
    defaultValue: { errors: [], balanceValidationResults: [], available: [] },
    fn: validator,
  });

  const $errors = $.map((v) => v.errors);
  const $balanceValidationResults = $.map((v) => v.balanceValidationResults);
  const $validationDone = not($isDefaultValue);
  const $valid = and(
    $validationDone,
    $errors.map((errors) => errors.length === 0),
  );
  const $failed = and(
    $validationDone,
    $errors.map((errors) => errors.length > 0),
  );

  let $available: Store<Balance[]>;
  if (calculateAvailable) {
    const { $: $localAvailable } = createStoreFromEffect({
      params: {
        ...params,
        excludeActions: createStore(calculateAvailable.exclude),
      },
      defaultValue: { errors: [], balanceValidationResults: [], available: [] },
      fn: validator,
    });

    $available = $localAvailable.map((v) => v.available);
  } else {
    $available = $.map((v) => v.available);
  }

  return {
    /**
     * All errors, empty array if no errors.
     */
    $errors,
    /**
     * All balance validation results, with successful too.
     */
    $balanceValidationResults,
    $pending,
    /**
     * The validator itself threw (a code or data failure, not a validation
     * error) — `$validationDone` stays false in that case.
     */
    $error,
    /**
     * Re-runs the validator with the current params.
     */
    retry,
    /**
     * True if validation is done, can be used to show loading state.
     *
     * ATTENTION! This is not the same as $valid, validation can be in failed
     * state.
     */
    $validationDone,
    /**
     * True if validation is done and errors are empty
     */
    $valid,
    /**
     * True if validation is done but there are some errors.
     */
    $failed,

    /**
     * Available balances after all withdraws and deposits are done.
     */
    $available,
  };
};
