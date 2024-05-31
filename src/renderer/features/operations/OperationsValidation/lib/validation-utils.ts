import { Validation, ValidationResult } from '../types/types';

export const validationUtils = {
  applyValidationRules,
};

const applyValidationRule = ({ value, form, source, name, errorText, validator }: Validation): ValidationResult => {
  // TODO: find another way to get state from source
  // eslint-disable-next-line effector/no-getState
  const sourceData = source.getState ? source.getState() : source;

  const isValid = validator(value, form, sourceData);

  if (!isValid) {
    return { name, errorText };
  }
};

export function applyValidationRules(validation: Validation[]): ValidationResult {
  for (const rule of validation) {
    const result = applyValidationRule(rule);

    if (result) {
      return result;
    }
  }
}
