import { type Store } from 'effector';

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
  const { $ } = createStoreFromEffect({
    params,
    defaultValue: { errors: [], balanceValidationResults: [] },
    fn: validator,
  });

  const $errors = $.map((v) => v.errors);
  const $balanceValidationResults = $.map((v) => v.balanceValidationResults);

  return {
    $errors,
    $balanceValidationResults,
  };
};
