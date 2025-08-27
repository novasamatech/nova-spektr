import { type Store } from 'effector';

import { createStoreFromEffect } from '@/shared/effector';
import {
  type TransactionValidationBalanceError,
  type TransactionValidationFatalError,
  type TransactionValidationPermissionError,
} from '@/shared/ui-entities';

type AnyValidator = (
  ...args: any[]
) => Promise<
  (TransactionValidationBalanceError | TransactionValidationPermissionError | TransactionValidationFatalError)[]
>;

type Stores<Args> = {
  [K in keyof Args]: Store<Args[K] | null>;
};

type Params<Validator extends AnyValidator> = {
  params: Stores<Parameters<Validator>[0]>;
  validator: Validator;
};

export const createTxValidationStore = <Validator extends AnyValidator>({ params, validator }: Params<Validator>) => {
  const { $: $errors } = createStoreFromEffect({
    params,
    defaultValue: [],
    fn: validator,
  });

  return {
    $errors,
  };
};
