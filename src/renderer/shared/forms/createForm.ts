import { type EventCallable, type Store, attach, combine, createEvent, restore, sample, scopeBind } from 'effector';
import { readonly, spread } from 'patronum';

import { entries } from '@/shared/lib/utils';

import { type Form, type FormField, type ValidateEvent, type ValidationError } from './types';

type ValidatorFunction<Value, Fields> = (
  value: Value,
  fields: Fields,
  source: any,
) => ValidationError | ValidationError[] | Promise<ValidationError[]> | void;

type Validator<Value, Fields> =
  | ValidatorFunction<Value, Fields>
  | {
      source: Store<any>;
      fn: ValidatorFunction<Value, Fields>;
    };

type FieldConfig<Value, Fields> = {
  defaultValue: Value;
  validator?: () => Validator<Value, Fields>;
};

type Config<Fields> = {
  fields: {
    [K in keyof Fields]?: FieldConfig<Fields[K], Fields>;
  };

  validateOn?: ValidateEvent[];
};

const EMPTY_ARRAY: never[] = [];

export const createForm = <Fields>(config: Config<Fields>): Form<Fields> => {
  type F = Form<Fields>;

  const validateOn = config.validateOn ?? ['submit'];
  const shouldValidateOnSubmit = validateOn.includes('submit');
  const shouldValidateOnChange = validateOn.includes('change');
  const fields: Record<string, FormField<any>> = {};
  const values: Record<string, Store<any>> = {};

  const reset = createEvent();
  const setForm = createEvent<Partial<Fields>>();

  for (const [key, field] of entries(config.fields)) {
    if (!field) continue;

    const change = createEvent<any>();
    const reset = createEvent<any>();
    const resetError = createEvent<any>();
    const $value = restore(change, field.defaultValue).reset(reset);

    const setErrors = createEvent<ValidationError[]>();
    const $errors = restore(setErrors, EMPTY_ARRAY).reset(reset, resetError, change);

    fields[key] = {
      $value: readonly($value),
      change,
      reset,
      resetError,

      $errors: readonly($errors),
      setErrors,
    };

    values[key] = $value;
  }

  const errorStores = Object.values(fields).map((field) => field.$errors);
  const $isValid = combine(errorStores, (allErrors) => {
    return allErrors.every((errors) => errors.length === 0);
  });

  const $values = combine(values);

  const validatorsPromise = Promise.resolve().then(() => {
    const validators: Record<string, ReturnType<Required<FieldConfig<any, any>>['validator']>> = {};

    for (const [key, field] of entries(config.fields)) {
      if (!field) continue;
      if (field.validator) {
        validators[key] = field.validator();
      }
    }

    return validators;
  });

  const validateFx: F['validate'] = attach({
    source: $values,
    async effect(values) {
      const validators = await validatorsPromise;
      const validatorsList = Object.entries(validators);

      const requests = validatorsList.map(([key, validator]) => {
        try {
          const value = values[key];
          if (typeof validator === 'function') {
            return validator(value, values, void 0);
          } else {
            // eslint-disable-next-line effector/no-getState
            const source = validator.source.getState();
            return validator.fn(value, values, source);
          }
        } catch (e) {
          const error: ValidationError = {
            message: e instanceof Error ? e.toString() : 'Unknown error',
          };
          return error;
        }
      });

      const responses = await Promise.allSettled(requests);

      return responses
        .map<ValidationError[]>((response) => {
          if (response.status === 'rejected') {
            return [
              {
                message: response.reason instanceof Error ? response.reason.message : response.toString(),
              },
            ];
          }

          if (Array.isArray(response.value)) {
            return response.value;
          }

          if (typeof response.value === 'undefined') {
            return EMPTY_ARRAY;
          }

          return [response.value];
        })
        .reduce<Record<string, ValidationError[]>>((acc, result, index) => {
          const validator = validatorsList[index];
          if (validator) {
            const key = validator[0];
            acc[key] = result;
          }

          return acc;
        }, {});
    },
  });

  const submitFx = attach({
    source: $values,
    async effect(values) {
      if (shouldValidateOnSubmit) {
        const bindedValidate = scopeBind(validateFx, { safe: true });
        const validationResult = await bindedValidate();
        const hasErrors = Object.values(validationResult).some((v) => v.length > 0);
        if (hasErrors) {
          throw validationResult;
        }
      }

      return values as Fields;
    },
  });

  const changeSpread = Object.entries(fields).reduce<Record<string, EventCallable<any>>>((acc, [key, field]) => {
    acc[key] = field.change;
    return acc;
  }, {});

  const errorsSpread = Object.entries(fields).reduce<Record<string, EventCallable<ValidationError[]>>>(
    (acc, [key, field]) => {
      acc[key] = field.setErrors;
      return acc;
    },
    {},
  );

  const resetSpread = Object.values(fields).map((field) => field.reset);

  sample({
    clock: validateFx.doneData,
    source: $values,
    fn(values, result) {
      const errors: Record<string, ValidationError[]> = {};
      for (const key of Object.keys(values)) {
        errors[key] = result[key] ?? EMPTY_ARRAY;
      }

      return errors;
    },
    target: spread(errorsSpread),
  });

  sample({
    clock: reset,
    target: resetSpread,
  });

  sample({
    clock: setForm,
    source: $values,
    fn(values, partial) {
      return {
        ...values,
        ...partial,
      };
    },
    target: spread(changeSpread),
  });

  if (shouldValidateOnChange) {
    for (const field of Object.values(fields)) {
      sample({
        clock: field.change,
        target: validateFx,
      });
    }
  }

  return {
    $values: $values as F['$values'],
    $isValid,
    fields: fields as F['fields'],
    setForm,
    submit: submitFx as unknown as F['submit'],
    reset,
    validate: validateFx,
  };
};
