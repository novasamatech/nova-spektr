type Validation = {
  value: any;
  name: string;
  errorText: string;
  source: any;
  form: any;
  validator: (...args: any) => boolean;
};

export type ValidationResult = { name: string; errorText: string } | undefined;

export const applyValidationRule = ({
  value,
  form,
  source,
  name,
  errorText,
  validator,
}: Validation): ValidationResult => {
  // TODO: find another way to get state from source
  // eslint-disable-next-line effector/no-getState
  const sourceData = source.getState ? source.getState() : source;

  const isValid = validator(value, form, sourceData);

  if (!isValid) {
    return { name, errorText };
  }
};

export const applyValidationRules = (validation: Validation[]): ValidationResult => {
  for (const rule of validation) {
    const result = applyValidationRule(rule);

    if (result) {
      return result;
    }
  }
};
