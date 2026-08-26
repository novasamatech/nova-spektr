import { type Store, createStore } from 'effector';
import { and } from 'patronum';

import { type Balance } from '@/shared/core';
import { createStoreFromEffect } from '@/shared/effector';
import { nonNullable } from '@/shared/lib/utils';

import { type ValidationResult, type Validator } from './createTxValidator';

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
  // `null` is "no verdict": the params are incomplete, the run is in flight, or
  // the validator itself reported that its inputs (signer, fee balance) are not
  // there yet. Every derived flag reads as "not done" in that state.
  const { $, $pending, $error, retry } = createStoreFromEffect<ValidatorParams<Validator>, ValidationResult | null>({
    params,
    defaultValue: null,
    fn: validator,
  });

  const $errors = $.map((v) => v?.errors ?? []);
  const $balanceValidationResults = $.map((v) => v?.balanceValidationResults ?? []);
  const $validationDone = $.map(nonNullable);
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
    const { $: $localAvailable } = createStoreFromEffect<
      ValidatorParams<Validator> & { excludeActions: string[] },
      ValidationResult | null
    >({
      params: {
        ...params,
        excludeActions: createStore(calculateAvailable.exclude),
      },
      defaultValue: null,
      fn: validator,
    });

    $available = $localAvailable.map((v) => v?.available ?? []);
  } else {
    $available = $.map((v) => v?.available ?? []);
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
     * The validator rejected outright — `$validationDone` stays false then.
     * `createTxValidator` catches its own failures and reports them as an
     * `internal` error with `$validationDone` true, so for those this stays
     * null; a missing signer or fee balance is no verdict at all
     * (`$validationDone` false, no error) until the inputs arrive.
     */
    $error,
    /**
     * Re-runs the validator with the current params.
     */
    retry,
    /**
     * True if validation reached a verdict, can be used to show loading state.
     * Stays false while the signer's fee balance is not known yet.
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
