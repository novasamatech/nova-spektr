import { type Store } from 'effector';
import { and, not } from 'patronum';

import { createStoreFromEffect } from '@/shared/effector';

import { type ValidationResult } from './createTxValidator';

type AnyValidator = (...args: any[]) => Promise<ValidationResult>;

type Stores<Args> = {
  [K in keyof Args]: Store<Args[K] | null>;
};

type ValidatorParams<Validator extends AnyValidator> = Parameters<Validator>[0];

type Params<Validator extends AnyValidator> = {
  params: Stores<ValidatorParams<Validator>>;
  validator: Validator;
};

export const createTxValidationStore = <Validator extends AnyValidator>({ params, validator }: Params<Validator>) => {
  const { $, $isDefaultValue, $pending } = createStoreFromEffect({
    params,
    defaultValue: { errors: [], balanceValidationResults: [] },
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
  };
};
