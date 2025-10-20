import { useUnit } from 'effector-react';
import { useCallback, useMemo } from 'react';

import { entries } from '@/shared/lib/utils';

import { type Form, type ValidationError } from './types';

type HookField<Value> = {
  value: Value;
  onChange(v: Value): void;
  reset(): void;
  resetError(): void;
  hasError: boolean;
  errorMessage: string;
  errorValues?: Record<string, unknown>;
  errors: ValidationError[];
};

type Hook<Fields> = {
  fields: {
    [K in keyof Fields]: HookField<Fields[K]>;
  };
  submit(): void;
  validate(): void;
};

export const useForm = <Fields>(form: Form<Fields>): Hook<Fields> => {
  const fieldEntries = useMemo(() => entries(form.fields), [form]);
  const fields: Record<string, HookField<any>> = {};

  // fields are stable, iteration with hook is ok here
  for (const [key, field] of fieldEntries) {
    const value = useUnit(field.$value);
    const errors = useUnit(field.$errors);
    fields[key] = {
      value,
      errors,
      reset: field.reset,
      resetError: field.resetError,
      onChange: field.change,
      hasError: errors.length > 0,
      errorMessage: errors.at(0)?.message ?? '',
      errorValues: errors.at(0)?.values,
    };
  }

  return {
    fields: fields as { [K in keyof Fields]: HookField<Fields[K]> },
    submit: useCallback(() => form.submit(), [form]),
    validate: useCallback(() => form.validate(), [form]),
  };
};
